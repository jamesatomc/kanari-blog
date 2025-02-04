## How to Use

### Step 1: Create the Markdown Processor Utility

Create a file named `markdownProcessor.ts` in the `utils` directory with the following content:

```typescript
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
```

### Step 2: Import and Use the Utility in Your Astro Page

In your Astro page (e.g., Kanari_SDK_Design.astro), import and use the processMarkdown function:

```astro
---
import Footer from "../components/Footer.astro";
import Navbar from "../components/Navbar.astro";
import Layout from "../layouts/Layout.astro";
import { processMarkdown } from "../utils/markdownProcessor";

// Use Astro's built-in functionality to import Markdown
const post = await Astro.glob("../content/post.md");
const markdownContent = post[0].rawContent();

// Process the Markdown content
const contentHtml = await processMarkdown(markdownContent);
---

<Layout title="Kanari SDK Design">
  <div class="flex flex-col min-h-screen">
    <Navbar />
    <div class="h-20"></div>
    <main class="flex-grow p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900">
      <article
        class="max-w-4xl mx-auto bg-gray-900 dark:bg-gray-800 p-6 rounded-lg shadow-md prose lg:prose-xl prose-invert"
      >
        <h1 class="text-3xl font-bold mb-4 text-white dark:text-gray-100">
          Kanari SDK Design
        </h1>
        <img
          src="https://raw.githubusercontent.com/kanari-network/about/main/kari1.png"
          alt="EP1 Image"
          class="w-full h-auto rounded-lg mb-4"
        />
        <div class="markdown-content" set:html={contentHtml} />
      </article>
    </main>
    <Footer />
  </div>
</Layout>
```