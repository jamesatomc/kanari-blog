// utils/markdownProcessor.ts
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";

export async function processMarkdown(markdownContent: string): Promise<string> {
  const processedContent = await unified()
    .use(remarkParse)
    .use(remarkGfm) // Use the GitHub Flavored Markdown plugin
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdownContent);

  return processedContent.toString();
}