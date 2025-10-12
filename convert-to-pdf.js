const fs = require('fs');
const path = require('path');

// Simple HTML template for PDF conversion
const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>AI Marketing Platform - Complete Documentation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        h1 {
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 8px;
        }
        code {
            background-color: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        pre {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            border-left: 4px solid #3498db;
        }
        pre code {
            background-color: transparent;
            padding: 0;
        }
        blockquote {
            border-left: 4px solid #3498db;
            padding-left: 20px;
            margin: 20px 0;
            color: #666;
        }
        ul, ol {
            margin: 15px 0;
            padding-left: 30px;
        }
        li {
            margin: 5px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        hr {
            border: none;
            border-top: 2px solid #ecf0f1;
            margin: 30px 0;
        }
        .toc {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .toc h2 {
            margin-top: 0;
            border-bottom: none;
        }
        .toc ul {
            list-style-type: none;
            padding-left: 0;
        }
        .toc li {
            margin: 8px 0;
        }
        .toc a {
            color: #3498db;
            text-decoration: none;
        }
        .toc a:hover {
            text-decoration: underline;
        }
        .page-break {
            page-break-before: always;
        }
        @media print {
            body {
                margin: 0;
                padding: 15px;
            }
            .page-break {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    <h1>AI Marketing Platform - Complete Documentation</h1>
    <div class="toc">
        <h2>Table of Contents</h2>
        <ul>
            <li><a href="#project-overview">1. Project Overview</a></li>
            <li><a href="#mcp-servers-templates-package">2. MCP Servers Templates Package</a></li>
            <li><a href="#mcp-server-quick-reference-card">3. MCP Server Quick Reference Card</a></li>
            <li><a href="#mcp-server-setup-instructions">4. MCP Server Setup Instructions</a></li>
            <li><a href="#windows-powershell-commands">5. Windows PowerShell Commands</a></li>
            <li><a href="#macoslinux-commands">6. macOS/Linux Commands</a></li>
            <li><a href="#common-mcp-servers">7. Common MCP Servers</a></li>
        </ul>
    </div>
</body>
</html>`;

// Read the combined markdown file
const markdownPath = path.join(__dirname, 'COMBINED_DOCUMENTATION.md');
const markdown = fs.readFileSync(markdownPath, 'utf8');

// Simple markdown to HTML converter
function markdownToHtml(markdown) {
    let html = markdown;

    // Convert headers
    html = html.replace(/^# (.+)$/gm, '<h1 id="$1">$1</h1>');
    html = html.replace(/^## (.+)$/gm, '<h2 id="$1">$1</h2>');
    html = html.replace(/^### (.+)$/gm, '<h3 id="$1">$3</h3>');
    html = html.replace(/^#### (.+)$/gm, '<h4 id="$1">$4</h4>');
    html = html.replace(/^##### (.+)$/gm, '<h5 id="$1">$5</h5>');
    html = html.replace(/^###### (.+)$/gm, '<h6 id="$1">$6</h6>');

    // Convert code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

    // Convert inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Convert bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Convert italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Convert links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Convert horizontal rules
    html = html.replace(/^---$/gm, '<hr>');

    // Convert lists (simplified)
    html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Convert line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraphs
    html = '<p>' + html + '</p>';

    // Clean up
    html = html.replace(/<p><h/g, '<h');
    html = html.replace(/<\/h(\d)><\/p>/g, '</h$1>');
    html = html.replace(/<p><hr><\/p>/g, '<hr>');
    html = html.replace(/<p><pre>/g, '<pre>');
    html = html.replace(/<\/pre><\/p>/g, '</pre>');
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<li>.*?<\/li>)<\/p>/g, '<ul>$1</ul>');
    html = html.replace(/<\/ul><p><ul>/g, '</ul><ul>');

    return html;
}

// Convert markdown to HTML
const contentHtml = markdownToHtml(markdown);

// Insert content into HTML template
const finalHtml = htmlTemplate.replace('</body>', contentHtml + '</body>');

// Write HTML file
const htmlPath = path.join(__dirname, 'COMBINED_DOCUMENTATION.html');
fs.writeFileSync(htmlPath, finalHtml);

console.log('HTML file created successfully:', htmlPath);
console.log('\nTo convert to PDF:');
console.log('1. Open the HTML file in your browser');
console.log('2. Use Ctrl+P or Cmd+P to print');
console.log('3. Select "Save as PDF" as the destination');
console.log('4. Adjust settings if needed and save');

// Alternative: Try to use headless Chrome if available
const { exec } = require('child_process');
const chromeCmd = '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --headless --disable-gpu --print-to-pdf="' + path.join(__dirname, 'COMBINED_DOCUMENTATION.pdf') + '" "' + htmlPath + '"';

exec(chromeCmd, (error, stdout, stderr) => {
    if (error) {
        console.log('\nCould not auto-generate PDF. Please follow the manual instructions above.');
        return;
    }
    console.log('\nPDF generated successfully: COMBINED_DOCUMENTATION.pdf');
});