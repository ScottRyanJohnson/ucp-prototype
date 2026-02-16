import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 p-8 font-sans dark:bg-zinc-950">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        UCP Prototype
      </h1>
      <nav className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/tv"
          className="rounded-full bg-zinc-900 px-6 py-3 text-center font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          TV Platform
        </Link>
        <Link
          href="/shop"
          className="rounded-full border border-zinc-300 px-6 py-3 text-center font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          ScoJo's Coffee Beans
        </Link>
        <Link
          href="/agent"
          className="rounded-full border border-zinc-300 px-6 py-3 text-center font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Agent
        </Link>
      </nav>
    </div>
  );
}
