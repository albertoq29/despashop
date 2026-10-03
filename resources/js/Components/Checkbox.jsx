export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-stone-300 bg-white text-marca-700 shadow-sm focus:ring-marca-600 ' +
                'dark:border-stone-700 dark:bg-stone-950 dark:text-marca-400 dark:focus:ring-marca-400 ' +
                className
            }
        />
    );
}
