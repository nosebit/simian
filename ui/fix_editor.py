import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Replace i18n useTranslations
    # import { useTranslations } from "@/i18n/client";
    # const t = useTranslations("editor");
    # t("foo") -> "foo"
    
    # Remove i18n imports
    content = re.sub(r'import\s+\{[^}]*useTranslations[^}]*\}\s+from\s+"@/i18n/client";?\n?', '', content)
    content = re.sub(r'import\s+\{[^}]*ExtendedTranslator[^}]*\}\s+from\s+"@/i18n/utils";?\n?', '', content)
    
    # Remove t instantiation
    content = re.sub(r'const\s+t\s*=\s*useTranslations\([^)]*\);?\n?', '', content)
    
    # Replace t("some.key") with "some.key"
    content = re.sub(r't\("([^"]+)"\)', r'"\1"', content)
    
    # Replace t("some.key", {...}) with "some.key"
    content = re.sub(r't\("([^"]+)",\s*\{[^}]*\}\)', r'"\1"', content)
    
    # Remove logr imports
    content = re.sub(r'import\s+\{\s*useLog\s*\}\s+from\s+"@/utils/logr/browser";?\n?', '', content)
    
    # Replace logr instantiation
    content = re.sub(r'const\s+log\s*=\s*useLog\([^)]*\);?\n?', '', content)
    
    # Replace log.debug() with console.debug()
    content = re.sub(r'log\.(debug|info|warn|error)\(', r'console.\1(', content)

    # Fix shadcn imports
    content = content.replace('@/modules/shadcn/ui/', '@/components/ui/')
    
    # Fix local ui imports
    content = content.replace('@/ui/button', '@/components/ui/button')
    
    # Replace useIsMobile with a dummy hook
    content = re.sub(r'import\s+\{\s*useIsMobile\s*\}\s+from\s+"@/hooks/mobile";?\n?', 'const useIsMobile = () => false;\n', content)
    
    # Replace useThemeMode
    content = re.sub(r'import\s+\{\s*useThemeMode\s*\}\s+from\s+"@/ui/utils/theme";?\n?', 'import { useTheme } from "next-themes";\n', content)
    content = content.replace('const { resolvedTheme } = useThemeMode();', 'const { resolvedTheme } = useTheme();')
    
    # Replace jetbrainsMono
    content = re.sub(r'import\s+\{\s*jetbrainsMono\s*\}\s+from\s+"@/ui/utils/fonts";?\n?', 'const jetbrainsMono = { className: "font-mono" };\n', content)
    
    # Fix absolute path to @/ui/editor to be local if inside editor
    # Actually it's easier to just configure tsconfig to map @/ui/editor to src/editor
    # We will do that in tsconfig

    with open(filepath, 'w') as f:
        f.write(content)

for root, dirs, files in os.walk('src/editor'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))
