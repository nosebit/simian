import { FC } from 'react'

import { ImageBaseItem } from './base'
import { ImageItemProps } from './types'

export const ImageItem: FC<ImageItemProps> = (props) => {
  return <ImageBaseItem {...props} />
}
