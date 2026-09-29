import Icon from './Icon';

export default function EmptyState({ icon = 'bag', title, body, action }) {
    return (
        <div className="flex flex-col items-center rounded-4xl border border-dashed border-line-strong px-6 py-20 text-center">
            <span className="mb-6 grid size-16 place-items-center rounded-full bg-mint-soft">
                <Icon name={icon} size={26} />
            </span>
            <h2 className="font-display text-4xl">{title}</h2>
            {body && <p className="mt-3 max-w-md text-ink-mute">{body}</p>}
            {action && <div className="mt-8">{action}</div>}
        </div>
    );
}
