export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            type={type}
            className={
                `inline-flex items-center rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-stone-700 dark:text-stone-300 shadow-sm transition duration-150 ease-in-out hover:bg-stone-50 dark:hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-25 ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
