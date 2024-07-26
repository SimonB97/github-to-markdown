# GitHub to Markdown Converter


This simple web application allows users to convert GitHub repositories into a single Markdown file. It's inspired by the [Copy Text Selected Files](https://marketplace.visualstudio.com/items?itemName=iyulab.copy-text-selected-files) VS Code extension by iyulab and designed to quickly provide a repo (or parts) as context to a Language Model.

![image.png - screenshot of the app](image.png)

## Features

- Sign in with GitHub
- Convert public and private repositories to Markdown
- Exclude specific file types, directories, or files
- Copy generated Markdown to clipboard or download the Markdown file

## Live Demo

You can try the app at [https://gh-md.netlify.app/](https://gh-md.netlify.app/)

## Technical Stack

- Frontend: HTML, JavaScript, Tailwind CSS
- Backend: Netlify Functions (TypeScript)
- GitHub API: Octokit
- Markdown Parsing: Marked.js
- Syntax Highlighting: highlight.js

## Credits

- Inspired by [Copy Text Selected Files](https://marketplace.visualstudio.com/items?itemName=iyulab.copy-text-selected-files) by iyulab
- Built and deployed on [Netlify](https://www.netlify.com/)

## License

[MIT License](LICENSE)