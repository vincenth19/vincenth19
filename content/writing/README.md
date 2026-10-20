# Writing

Each post is one `.mdx` file in this folder. The file name is the URL:
`content/writing/designing-the-desk.mdx` is published at `/writing/designing-the-desk`.

## Add a post

1. Copy `_template.mdx` to a new file named after the post, e.g. `designing-the-desk.mdx`.
   Use lowercase words joined by hyphens.
2. Fill in the `metadata` export at the top. All three fields are required:

   ```mdx
   export const metadata = {
   	title: 'Designing the desk',
   	date: '2027-01-15', // YYYY-MM-DD, used to sort posts newest first
   	summary: 'One sentence shown under the title in the list and on the post.',
   };
   ```

3. Write the post below it in Markdown. Start sections with `##` and smaller headings
   with `###` (they sit under the post title, which the page renders for you).
   Links, lists, quotes, `code` and fenced code blocks are all styled, and so are
   GitHub's Markdown extras: tables, `~~strikethrough~~`, task lists (`- [x] done`)
   and bare URLs, which become links.
4. Run `bun run dev` and open `/writing` to check it. That's it: the Writing page lists
   the post and the "Coming soon" card disappears on its own.

## Notes

- Files starting with `_` are never published. Rename a post to `_my-post.mdx` to keep
  it as a draft. Keep `_template.mdx`: the build needs at least one `.mdx` file here,
  and stops with a message saying so if there is none.
- Images go in `public/` and are referenced with an absolute path, e.g.
  `![Alt text](/writing/designing-the-desk/sketch.png)`.
- A post with missing or malformed `metadata` fails the build with a message naming the file.
