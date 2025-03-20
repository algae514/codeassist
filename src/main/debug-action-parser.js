const testText = `I'll create a file named \`project_structure.txt\` and write the project structure information into it.[[WRITE: /Users/balajiv/Documents/coderepos/alumini/alumini-admin-web-react-app/project_structure.txt,"Project Structure of alumini-admin-web-react-app:\\n\\n1. README.md: Project documentation file.\\n2. auto_docs: Directory for automated documentation.\\n3. build: Contains build artifacts including index.html, asset-manifest.json, and static files.\\n- static/js: Contains JavaScript files including main.a7d7040a.js and its map files.\\n4. deploy.sh: Shell script for deployment.\\n5. docs: Directory containing various documentation files related to the project.\\n- Files: README.md, api-integration.md, architecture.md, authentication.md, authorization.md, component-structure.md, feature-sed-initiatives.md, project-overview.md, routing.md, todo-improvements.md\\n6. node_modules: Contains all npm dependencies for the project.\\n7. package.json: NPM package configuration file.\\n8. projectSummary.md: Summary of the project.\\n9. public: Directory for public assets.\\n10. src: Source code of the application.\\n11. tailwind.config.js: Configuration file for Tailwind CSS.\\n12. yarn.lock: Lock file for Yarn dependencies.\\n"]]]`;

// Try different regex patterns
console.log("Testing regex patterns...");

// Original pattern
const originalPattern = /\[\[(.*?)\]\]/g;
console.log("\nOriginal pattern results:");
let match;
while ((match = originalPattern.exec(testText)) !== null) {
  console.log("Match found:", match[0]);
  console.log("Group 1:", match[1]);
}

// Improved pattern 1
const improvedPattern1 = /\[\[(?:\s*)(\w+)\s*:([\s\S]*?)\]\]/g;
console.log("\nImproved pattern 1 results:");
while ((match = improvedPattern1.exec(testText)) !== null) {
  console.log("Match found:", match[0]);
  console.log("Action type:", match[1]);
  console.log("Parameters:", match[2]);
}

// Improved pattern 2
const improvedPattern2 = /\[\[([\w]+)\s*:\s*([\s\S]*?)\]\]/g;
console.log("\nImproved pattern 2 results:");
while ((match = improvedPattern2.exec(testText)) !== null) {
  console.log("Match found:", match[0]);
  console.log("Action type:", match[1]);
  console.log("Parameters:", match[2]);
}

// Improved pattern 3 - match directly with action types
const improvedPattern3 = /\[\[(WRITE|READ|EXECUTE|APPEND|DELETE)\s*:\s*([\s\S]*?)\]\]/gi;
console.log("\nImproved pattern 3 results:");
while ((match = improvedPattern3.exec(testText)) !== null) {
  console.log("Match found:", match[0]);
  console.log("Action type:", match[1]);
  console.log("Parameters:", match[2]);
}
