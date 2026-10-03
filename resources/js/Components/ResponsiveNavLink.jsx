import { Link } from '@inertiajs/react';

export default function ResponsiveNavLink({
    active = false,
    className = '',
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={`flex w-full items-start border-l-4 py-2 pe-4 ps-3 ${
                active
                    ? 'border-indigo-400 bg-stone-100 dark:bg-stone-800 text-indigo-700 focus:border-indigo-700 focus:bg-indigo-100 focus:text-indigo-800'
                    : 'border-transparent text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-800 dark:hover:text-stone-100 focus:border-stone-400 dark:focus:border-stone-600 focus:bg-stone-50 dark:focus:bg-stone-900 focus:text-stone-800 dark:focus:text-stone-200'
            } text-base font-medium transition duration-150 ease-in-out focus:outline-none ${className}`}
        >
            {children}
        </Link>
    );
}
