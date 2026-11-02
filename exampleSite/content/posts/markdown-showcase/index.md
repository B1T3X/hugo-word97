---
title: Markdown Showcase
date: 2026-03-01
description: Headings, lists, tables, code, quotes and footnotes rendered as a Word document.
tags: [markdown, theme]
categories: [General]
---

This post exercises every Markdown element the theme styles.

## Heading 2

### Heading 3

#### Heading 4

Text with **bold**, *italic*, `inline code` and a [link](https://gohugo.io/).[^1]

- Unordered item
- Another item
  - Nested item

1. Ordered item
2. Second item

> A blockquote. Word called this an indented paragraph.

| Setting      | Default | Notes                 |
|--------------|---------|-----------------------|
| `titleStyle` | purple  | Home page title style |
| `latestPostsCount` | 8 | Posts on the home page |

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: word97
data:
  theme: "It looks like you're writing a ConfigMap. Would you like help?"
```

```python
def hello(name: str) -> str:
    return f"Hello, {name}! This line is long enough to show that code blocks scroll horizontally instead of overflowing the page."
```

---

[^1]: Footnotes get Word's two-inch separator line.
