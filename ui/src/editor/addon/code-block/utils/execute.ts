import { Editor, Element, Node, Path, Transforms } from 'slate'

export const executeCodeBlock = async (editor: Editor, path: Path) => {
  const nodeIndex = path[0]
  let fullCode = ''
  
  // Accumulate all code blocks up to and including the current one
  for (let i = 0; i <= nodeIndex; i++) {
    const n = editor.children[i]
    if (Element.isElement(n) && n.type === 'code-block') {
      if (i === nodeIndex) {
        fullCode += 'println!("__SIMIAN_BLOCK_START__");\n'
      }
      fullCode += Node.string(n) + '\n'
    }
  }

  // Set evaluating to true
  Transforms.setNodes(editor, { isEvaluating: true }, { at: path })

  try {
    const id = window.location.pathname.substring(1)
    const response = await fetch(`/api/execute/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: fullCode }),
    })

    if (!response.body) throw new Error('No response body')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    
    let rawOutput = ''
    let processedOutput = ''
    let items: { url: string; state?: any }[] = []
    let success = true // Assume success while streaming so it renders green
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      rawOutput += decoder.decode(value, { stream: true })
      
      if (rawOutput.includes('__SIMIAN_EXIT_FAILURE__')) {
        success = false
        rawOutput = rawOutput.replace(/\n?__SIMIAN_EXIT_FAILURE__\n?/g, '')
      }
      if (rawOutput.includes('__SIMIAN_EXIT_SUCCESS__')) {
        success = true
        rawOutput = rawOutput.replace(/\n?__SIMIAN_EXIT_SUCCESS__\n?/g, '')
      }

      // Isolate current block's output
      const marker = '__SIMIAN_BLOCK_START__\n'
      const parts = rawOutput.split(marker)
      const isolatedOutput = parts.length > 1 ? parts.slice(1).join(marker) : rawOutput
      
      // Handle carriage returns for in-place progress bar updates
      let cleanOutput = isolatedOutput.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '') // strip ANSI codes

      let tempOutput = cleanOutput
      items = []
      const beginMarker = '__SIMIAN_BEGIN_CONTENT\n'
      const endMarker = '\n__SIMIAN_END_CONTENT'
      
      while (tempOutput.includes(beginMarker) && tempOutput.includes(endMarker)) {
        const startIdx = tempOutput.indexOf(beginMarker)
        const endIdx = tempOutput.indexOf(endMarker, startIdx)
        if (endIdx !== -1) {
          const url = tempOutput.substring(startIdx + beginMarker.length, endIdx)
          items.push({ url })
          
          let afterEnd = endIdx + endMarker.length
          if (tempOutput[afterEnd] === '\n') {
            afterEnd += 1 // strip the trailing newline if it exists
          }
          
          tempOutput = tempOutput.substring(0, startIdx) + tempOutput.substring(afterEnd)
        } else {
          break
        }
      }

      const lines = tempOutput.split('\n')
      const finalLines: string[] = []
      
      for (const line of lines) {
        if (line.includes('\r')) {
          // Progress bars output \r to return to the beginning of the line.
          // We take the last non-empty segment of that line to show the final state.
          const subparts = line.split('\r').filter(s => s.length > 0)
          if (subparts.length > 0) {
            finalLines.push(subparts[subparts.length - 1])
          } else {
            finalLines.push('')
          }
        } else {
          finalLines.push(line)
        }
      }
      
      processedOutput = finalLines.join('\n')
      
      Transforms.setNodes(
        editor, 
        { 
          isEvaluating: true,
          output: { stdout: success ? processedOutput : '', stderr: success ? '' : processedOutput, success, items }
        }, 
        { at: path }
      )
    }

    Transforms.setNodes(
      editor, 
      { 
        isEvaluating: false,
        output: { stdout: success ? processedOutput : '', stderr: success ? '' : processedOutput, success, items }
      }, 
      { at: path }
    )
  } catch (e) {
    Transforms.setNodes(
      editor,
      {
        isEvaluating: false,
        output: {
          stderr: e instanceof Error ? e.message : String(e),
          stdout: '',
          success: false,
        },
      },
      { at: path },
    )
  }
}
