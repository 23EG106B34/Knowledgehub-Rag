import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';


export const Navbar = () => {
  return (
    <nav className="flex items-center justify-between p-4 bg-light-card dark:bg-dark-card glass rounded-b-xl shadow-md">
      <Link
        href="/"
        className="text-2xl font-bold text-light-primary dark:text-dark-primary gradient-light dark:gradient-dark"
      >
        KnowledgeHub RAG
      </Link>
      <ThemeToggle />
    </nav>
  );

};
