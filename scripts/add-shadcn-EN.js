#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';

(async () => {
  console.log('--------------------------------------------------------');
  console.log('--🚀 Welcome to the Shadcn UI component installer--');
  console.log('--------------------------------------------------------');
  console.log('\n🌐 You can check out a demo of the components here:');
  console.log('🔗 https://ui.shadcn.com/docs/components\n');

  const extractVariants = (content) => {
    const cvaStart = content.indexOf('cva(');
    if (cvaStart === -1) {
      return { variantBlock: '', newContent: content, variantName: null };
    }

    let start = content.lastIndexOf('const', cvaStart);
    if (start === -1) {
      start = cvaStart;
    }

    let i = cvaStart + 4;
    let depth = 1;
    let inString = null;
    let escaped = false;

    while (i < content.length && depth > 0) {
      const char = content[i];

      if (escaped) {
        escaped = false;
      } else if (char === '\\' && inString) {
        escaped = true;
      } else if (inString) {
        if (char === inString) {
          inString = null;
        }
      } else if (char === '"' || char === "'" || char === '`') {
        inString = char;
      } else if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
      }

      i++;
    }

    while (i < content.length && /\s/.test(content[i])) {
      i++;
    }
    if (content[i] === ';') {
      i++;
    }

    const original = content.slice(start, i).trim();
    const exported = original.replace(/^const\s+/, 'export const ');

    // Extract variant name (alertVariants, buttonVariants, etc.)
    const nameMatch = original.match(/^const\s+([a-zA-Z0-9_]+)/);
    const variantName = nameMatch?.[1] ?? null;

    const newContent = content.replace(original, '').trim();

    return { variantBlock: exported, newContent, variantName };
  };

  const toPascalCase = (str) =>
    str
      .split(/[-_ ]+/)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join('');

  /*
    Unavailable:
    'calendar',
    'carousel',
    'collapsible',
    'form',
    'input-otp',
    'sidebar',
    'slider',
  */
  // Predefined component list
  const componentList = [
    'accordion',
    'alert-dialog',
    'avatar',
    'alert',
    'badge',
    'breadcrumb',
    'button',
    'calendar',
    'card',
    'checkbox',
    'command',
    'context-menu',
    'dialog',
    'dropdown-menu',
    'hover-card',
    'input',
    'label',
    'menubar',
    'navigation-menu',
    'pagination',
    'popover',
    'progress',
    'radio-group',
    'scroll-area',
    'select',
    'separator',
    'sheet',
    'skeleton',
    'sonner',
    'switch',
    'table',
    'tabs',
    'textarea',
    'toggle',
    'toggle-group',
    'tooltip'
  ];

  // Ask if they want to install a single or multiple components
  const response = await prompts([
    {
      type: 'select',
      name: 'selectionType',
      message: 'Do you want to install a single component or multiple?',
      choices: [
        { title: 'A single component', value: 'single' },
        { title: 'Multiple components', value: 'multiple' }
      ]
    },
    {
      type: (prev) => (prev === 'multiple' ? 'multiselect' : null),
      name: 'components',
      message: 'Which components do you want to install?',
      choices: componentList.map((component) => ({ title: component, value: component })),
      min: 1 // Ensure at least one component is selected
    },
    {
      type: (prev) => (prev === 'single' ? 'text' : null),
      name: 'componentName',
      message: 'Component name? (Example: button)',
      validate: (value) => (value ? true : 'The name is required')
    }
  ]);

  const componentsToInstall = response.selectionType === 'single' ? [response.componentName] : response.components;

  const componentsJsonPath = path.resolve('components.json');
  const componentsConfig = JSON.parse(fs.readFileSync(componentsJsonPath, 'utf-8'));
  const componentsAlias = componentsConfig.aliases?.ui ?? 'src/components/atoms';

  for (const componentName of componentsToInstall) {
    console.log('--------------------------------------------------------');
    const command = `npx shadcn@latest add ${componentName}`;
    console.log(`🚀 Running: ${command}`);

    try {
      execSync(command, { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Error executing command:', error.message);
      process.exit(1);
    }

    const generatedFiles = fs.readdirSync(componentsAlias);
    for (const file of generatedFiles) {
      const generatedFilePath = path.join(componentsAlias, file);

      if (!fs.existsSync(generatedFilePath)) {
        // Check if the folder exists, if not, create it after installation
        console.error(`❌ Folder not found for generated file: ${file}`);
        continue;
      }
      if (fs.lstatSync(generatedFilePath).isFile()) {
        console.log('--------------------------------------------------------');
        console.log(`🔧 Processing file: ${generatedFilePath}`);

        const content = fs.readFileSync(generatedFilePath, 'utf-8');
        const { variantBlock, newContent, variantName } = extractVariants(content);
        const cleanedContent = newContent;

        const baseName = path.basename(generatedFilePath, '.tsx');
        const pascalName = toPascalCase(baseName);

        // Generate target folder for the component
        const finalFolder = path.join(componentsAlias, baseName);
        const finalComponentPath = path.join(finalFolder, `${pascalName}.tsx`);

        // Check if it already exists
        if (fs.existsSync(finalFolder) || fs.existsSync(finalComponentPath)) {
          console.log(`⚠️  Component "${pascalName}" already imported. Skipping...`);
          fs.unlinkSync(generatedFilePath);
          continue;
        }

        // Create folder for generated component
        fs.mkdirSync(finalFolder, { recursive: true });
        console.log(`🔧 Generating component "${pascalName}"...`);
        if (variantBlock) {
          const variantsContent = `import { cva } from 'class-variance-authority';\n\n${variantBlock}`;
          fs.writeFileSync(path.join(finalFolder, 'variants.ts'), variantsContent);
        }

        let componentContent = cleanedContent.replace(
          /import\s+\*\s+as\s+React\s+from\s+['"]react['"]/,
          "import type * as React from 'react'"
        );

        if (variantBlock && variantName) {
          componentContent = componentContent.replace(
            /import\s+\{([^}]+)\}\s+from\s+['"]class-variance-authority['"]/,
            "import type { VariantProps } from 'class-variance-authority'\n" +
              `import { ${variantName} } from './variants'`
          );
        }

        componentContent = componentContent.replace('\n\n\n\n', '\n\n');

        fs.writeFileSync(path.join(finalFolder, `${pascalName}.tsx`), componentContent);

        fs.writeFileSync(
          path.join(finalFolder, 'index.ts'),
          (variantBlock ? `export * from './variants'\n` : '') + `export * from './${pascalName}'\n`
        );

        console.log(`✅ Component "${pascalName}" created at: ${finalComponentPath}`);
        console.log('--------------------------------------------------------');

        // Delete temporary file
        fs.unlinkSync(generatedFilePath);

        // Clean up temporary folder if it no longer contains files
        const tempFolderPath = path.join(componentsAlias, baseName);
        if (fs.existsSync(tempFolderPath) && fs.lstatSync(tempFolderPath).isDirectory()) {
          const remainingFiles = fs.readdirSync(tempFolderPath);
          if (remainingFiles.length === 0) {
            fs.rmdirSync(tempFolderPath);
          }
        }
      }
    }
    console.log('--------------------------------------------------------');
    console.log('🎉 All done! Components installed.');
    console.log('🎨 You can now enjoy customizing the components.');
    console.log('--------------------------------------------------------');
  }
})();