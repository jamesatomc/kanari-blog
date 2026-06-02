// utils/markdownProcessor.ts
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import type { Element, Parent, Root, RootContent } from "hast";

function classNames(value: Element["properties"]["className"]): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(" ");
  return [];
}

function wrapCodeBlocks(node: Parent) {
  node.children = node.children.map((child): RootContent => {
    if (child.type === "element" && child.tagName === "pre") {
      const pre: Element = {
        ...child,
        properties: {
          ...child.properties,
          className: [...classNames(child.properties.className), "docs-code-block"],
        },
      };

      return {
        type: "element",
        tagName: "div",
        properties: { className: ["docs-code-frame"] },
        children: [
          {
            type: "element",
            tagName: "button",
            properties: {
              ariaLabel: "Copy code",
              className: ["docs-code-copy"],
              type: "button",
            },
            children: [],
          },
          pre,
        ],
      };
    }

    if ("children" in child) wrapCodeBlocks(child);
    return child;
  });
}

function rehypeCodeFrames() {
  return (tree: Root) => wrapCodeBlocks(tree);
}

export async function processMarkdown(markdownContent: string): Promise<string> {
  const processedContent = await unified()
    .use(remarkParse)
    .use(remarkGfm) // Use the GitHub Flavored Markdown plugin
    .use(remarkRehype)
    .use(rehypeCodeFrames)
    .use(rehypeStringify)
    .process(markdownContent);

  return processedContent.toString();
}
