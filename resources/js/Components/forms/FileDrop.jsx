import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/Components/ui/Icon';
import { cn } from '@/lib/cn';

/** Drag & drop / click-to-browse file picker with image preview. */
export default function FileDrop({ file, onChange, accept, maxMb, error, label = 'Drop your prescription here' }) {
    const input = useRef(null);
    const [dragging, setDragging] = useState(false);
    const preview = useMemo(() => (file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null), [file]);
    useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

    const pick = (files) => {
        const f = files?.[0];
        if (f) onChange(f);
    };

    return (
        <div>
            <div
                role="button"
                tabIndex={0}
                onClick={() => input.current?.click()}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    pick(e.dataTransfer.files);
                }}
                className={cn(
                    'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-4xl border-2 border-dashed p-8 text-center transition',
                    dragging ? 'border-teal bg-mint-soft' : error ? 'border-coral' : 'border-line-strong hover:border-ink',
                )}
            >
                {file ? (
                    <>
                        {preview ? (
                            <img src={preview} alt="Selected prescription" className="max-h-48 rounded-2xl object-contain" />
                        ) : (
                            <Icon name="file" size={40} />
                        )}
                        <p className="font-medium">{file.name}</p>
                        <p className="text-xs text-ink-mute">{(file.size / 1024 / 1024).toFixed(2)} MB · click to replace</p>
                    </>
                ) : (
                    <>
                        <span className="grid size-14 place-items-center rounded-full bg-ink text-paper">
                            <Icon name="upload" size={22} />
                        </span>
                        <p className="font-display text-2xl">{label}</p>
                        <p className="text-sm text-ink-mute">
                            or click to browse · {accept.map((t) => t.toUpperCase()).join(', ')} up to {maxMb} MB
                        </p>
                    </>
                )}
                <input
                    ref={input}
                    type="file"
                    aria-label="Choose a prescription file (photo or PDF)"
                    className="sr-only"
                    accept={accept.map((t) => `.${t}`).join(',')}
                    onChange={(e) => pick(e.target.files)}
                />
            </div>
            {error && <p className="mt-2 text-sm text-coral">{error}</p>}
        </div>
    );
}
