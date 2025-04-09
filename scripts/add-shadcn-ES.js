#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';

(async () => {
  console.log('--------------------------------------------------------');
  console.log('--🚀 Bienvenido al instalador de componentes Shadcn UI--');
  console.log('--------------------------------------------------------');
  console.log('\n🌐 Puedes consultar una demo de los componentes aquí:');
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

    // Extraer nombre de la constante (alertVariants, buttonVariants, etc.)
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
  // Lista de componentes predefinidos
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

  // Preguntar si desea añadir un componente
  const response = await prompts([
    {
      type: 'select',
      name: 'selectionType',
      message: '¿Quieres instalar un solo componente o varios?',
      choices: [
        { title: 'Un solo componente', value: 'single' },
        { title: 'Varios componentes', value: 'multiple' }
      ]
    },
    {
      type: (prev) => (prev === 'multiple' ? 'multiselect' : null),
      name: 'components',
      message: '¿Qué componentes deseas instalar?',
      choices: componentList.map((component) => ({ title: component, value: component })),
      min: 1 // Asegurar que seleccionen al menos un componente
    },
    {
      type: (prev) => (prev === 'single' ? 'text' : null),
      name: 'componentName',
      message: '¿Nombre del componente? (Ejemplo: button)',
      validate: (value) => (value ? true : 'El nombre es obligatorio')
    }
  ]);

  const componentsToInstall = response.selectionType === 'single' ? [response.componentName] : response.components;

  const componentsJsonPath = path.resolve('components.json');
  const componentsConfig = JSON.parse(fs.readFileSync(componentsJsonPath, 'utf-8'));
  const componentsAlias = componentsConfig.aliases?.ui ?? 'src/components/atoms';

  for (const componentName of componentsToInstall) {
    console.log('--------------------------------------------------------');
    const command = `npx shadcn@latest add ${componentName}`;
    console.log(`🚀 Ejecutando: ${command}`);

    try {
      execSync(command, { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Error al ejecutar el comando:', error.message);
      process.exit(1);
    }

    const generatedFiles = fs.readdirSync(componentsAlias);
    for (const file of generatedFiles) {
      const generatedFilePath = path.join(componentsAlias, file);

      if (!fs.existsSync(generatedFilePath)) {
        // Verificamos si la carpeta existe, si no, la creamos después de la instalación
        console.error(`❌ No se encontró la carpeta generada para: ${file}`);
        continue;
      }
      if (fs.lstatSync(generatedFilePath).isFile()) {
        console.log('--------------------------------------------------------');
        console.log(`🔧 Procesando archivo: ${generatedFilePath}`);

        const content = fs.readFileSync(generatedFilePath, 'utf-8');
        const { variantBlock, newContent, variantName } = extractVariants(content);
        const cleanedContent = newContent;

        const baseName = path.basename(generatedFilePath, '.tsx');
        const pascalName = toPascalCase(baseName);

        // Generar la carpeta destino para el componente
        const finalFolder = path.join(componentsAlias, baseName);
        const finalComponentPath = path.join(finalFolder, `${pascalName}.tsx`);

        // Verificar si ya existe
        if (fs.existsSync(finalFolder) || fs.existsSync(finalComponentPath)) {
          console.log(`⚠️  Componente "${pascalName}" ya está importado. Saltando...`);
          fs.unlinkSync(generatedFilePath);
          continue;
        }

        // Crear la carpeta para el componente generado
        fs.mkdirSync(finalFolder, { recursive: true });
        console.log(`🔧 Generando componente "${pascalName}"...`);
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

        console.log(`✅ Componente "${pascalName}" creado en: ${finalComponentPath}`);
        console.log('--------------------------------------------------------');

        // Eliminar archivo temporal
        fs.unlinkSync(generatedFilePath);

        // Limpiar la carpeta temporal si ya no contiene archivos
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
    console.log('🎉 ¡Listo! Componentes instalados.');
    console.log('🎨 Ahora puedes disfrutar personalizando los componentes.');
    console.log('--------------------------------------------------------');
  }
})();
