import type { MDXComponents } from 'mdx/types'

// Typographie des guides — mappée sur les tokens de marque.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => (
      <h1 className="font-display text-3xl leading-[1.1] font-semibold md:text-4xl" {...props} />
    ),
    h2: (props) => <h2 className="font-display mt-10 text-2xl font-semibold" {...props} />,
    h3: (props) => <h3 className="font-display mt-6 text-lg font-semibold" {...props} />,
    p: (props) => <p className="text-ink-700 mt-4 leading-relaxed" {...props} />,
    ul: (props) => <ul className="text-ink-700 mt-4 list-disc space-y-1.5 pl-6" {...props} />,
    ol: (props) => <ol className="text-ink-700 mt-4 list-decimal space-y-1.5 pl-6" {...props} />,
    strong: (props) => <strong className="text-ink-900 font-semibold" {...props} />,
    ...components,
  }
}
