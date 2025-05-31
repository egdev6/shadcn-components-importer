# Shadcn UI Component Installer

This script allows you to easily install and configure Shadcn UI components into your project, adapting them to your custom file structure and adding support for component variants. It helps automate the process of adding Shadcn UI components and organizing them into PascalCase file names and directories.

## Features

- Install a single or multiple Shadcn UI components.
- Automatically generates component files in PascalCase format.
- Supports variant extraction and creates separate `variants.ts` files for components with variants.
- Cleans up temporary files and directories after installation.
- Customizes imports to better fit your project setup.
- Handles missing directories by creating them automatically.

## Installation

1. Clone this repository or add the script to your project or add the files, dependencies and script into your package.json
2. Ensure you have [Node.js](https://nodejs.org) installed.
3. Install dependencies:

```bash
npm install
```
⚠️ IMPORTANT! ⚠️
The script uses a configurable alias for your components' directory. By default, it uses src/components/atoms, but you can modify this by editing the components.json file in your project.

## Usage

Run the script with the following command:

### Spanish
```bash
npm run shadcn:add:es
```

### English
```bash
npm run shadcn:add:en
```

You will be prompted with the following options:

Install a single component: You can choose to install one component by specifying its name.
Install multiple components: Select multiple components to install at once.

The script will automatically install the selected components using npx shadcn@latest add.
Process the generated files.
Extract component variants (if any) and place them in a variants.ts file.
Organize components into their own directories with PascalCase filenames.
Clean up unnecessary or temporary files.

Display the installation status and provide feedback.

Contributing
Feel free to open an issue or submit a pull request if you find bugs or want to add new features.
