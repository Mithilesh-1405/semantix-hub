import React, { useEffect, useState } from 'react';

interface SearchResult {
    id: number;
    page: number;
    similarity: number;
    similarityPercent: number;
    text: string;
    metadata: {
        source: string;
        pdfId: number;
    };
}

interface PDFHighlighterProps {
    activeResult: SearchResult | null;
    currentPage: number;
    scale: number;
}

interface HighlightRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

// Normalize text helper for high-accuracy semantic matching
function getNormalizedMapping(text: string) {
    let normalized = '';
    const indexMap: number[] = [];

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (/\s/.test(char)) {
            if (normalized.length > 0 && normalized[normalized.length - 1] !== ' ') {
                normalized += ' ';
                indexMap.push(i);
            }
        } else {
            let normalizedChar = char.toLowerCase();
            if (normalizedChar === '’' || normalizedChar === '‘' || normalizedChar === '`') {
                normalizedChar = "'";
            } else if (normalizedChar === '“' || normalizedChar === '”') {
                normalizedChar = '"';
            } else if (normalizedChar === '–' || normalizedChar === '—') {
                normalizedChar = '-';
            }
            normalized += normalizedChar;
            indexMap.push(i);
        }
    }
    return { normalized, indexMap };
}

export default function PDFHighlighter({
    activeResult,
    currentPage,
    scale,
}: PDFHighlighterProps) {
    const [highlightRects, setHighlightRects] = useState<HighlightRect[]>([]);
    const [containerStyle, setContainerStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        let active = true;
        let observer: MutationObserver | null = null;

        const performHighlight = () => {
            if (!activeResult || activeResult.page !== currentPage) {
                setHighlightRects([]);
                return;
            }

            const textLayer = document.querySelector('[class*="textLayer"]') as HTMLElement;
            if (!textLayer) {
                setHighlightRects([]);
                return;
            }

            // Sync the highlights overlay container to perfectly match the textLayer positioning
            setContainerStyle({
                position: 'absolute',
                top: textLayer.offsetTop,
                left: textLayer.offsetLeft,
                width: textLayer.offsetWidth,
                height: textLayer.offsetHeight,
                pointerEvents: 'none',
                zIndex: 10,
            });

            const text = activeResult.text;
            if (!text || text.trim().length < 5) {
                setHighlightRects([]);
                return;
            }

            const spans = Array.from(textLayer.querySelectorAll('span'));
            if (spans.length === 0) {
                setHighlightRects([]);
                return;
            }

            // Build unified text content of the page
            let fullText = '';
            const spanIndices: { span: HTMLSpanElement; start: number; end: number }[] = [];

            spans.forEach((span) => {
                const textVal = span.textContent || '';
                const start = fullText.length;
                fullText += textVal;
                const end = fullText.length;
                spanIndices.push({ span, start, end });
            });

            const { normalized: normalizedPage, indexMap } = getNormalizedMapping(fullText);

            // Resilient matching strategy:
            // 1. Try full search result text
            // 2. Try individual sentences split by punctuation (min 15 chars)
            // 3. Try first 80 characters of the text
            const searchCandidates = [
                text,
                ...text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length >= 15),
                text.substring(0, Math.min(80, text.length)).trim()
            ];

            let matched = false;
            for (const candidate of searchCandidates) {
                const { normalized: normalizedQuery } = getNormalizedMapping(candidate);
                if (normalizedQuery.length < 8) continue;

                const matchIdx = normalizedPage.indexOf(normalizedQuery);
                if (matchIdx !== -1) {
                    // Match found! Identify original start & end character positions
                    const matchStartInOriginal = indexMap[matchIdx];
                    const lastCharIdx = matchIdx + normalizedQuery.length - 1;
                    const matchEndInOriginal = indexMap[lastCharIdx] + 1;

                    const newRects: HighlightRect[] = [];
                    const textLayerRect = textLayer.getBoundingClientRect();

                    // Calculate overlay bounds using precise browser DOM range selectors
                    spanIndices.forEach(({ span, start: spanStart, end: spanEnd }) => {
                        const localStart = Math.max(0, matchStartInOriginal - spanStart);
                        const localEnd = Math.min(spanEnd - spanStart, matchEndInOriginal - spanStart);

                        if (localEnd > localStart) {
                            const textNode = span.firstChild;
                            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                                try {
                                    const range = document.createRange();
                                    range.setStart(textNode, localStart);
                                    range.setEnd(textNode, localEnd);

                                    const rangeRect = range.getBoundingClientRect();
                                    if (rangeRect.width > 0 && rangeRect.height > 0) {
                                        newRects.push({
                                            top: rangeRect.top - textLayerRect.top,
                                            left: rangeRect.left - textLayerRect.left,
                                            width: rangeRect.width,
                                            height: rangeRect.height,
                                        });
                                    }
                                } catch (e) {
                                    // Soft catch for text nodes that might have changed dynamically
                                }
                            }
                        }
                    });

                    if (newRects.length > 0) {
                        setHighlightRects(newRects);

                        // Smoothly scroll the highlighted section to the vertical center of the view panel
                        const firstRect = newRects[0];
                        const scrollContainer = textLayer.closest('.overflow-auto') || textLayer.parentElement;
                        if (scrollContainer) {
                            const pageOffsetTop = textLayer.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top + scrollContainer.scrollTop;
                            const targetScrollTop = pageOffsetTop + firstRect.top - (scrollContainer.offsetHeight / 2);
                            
                            scrollContainer.scrollTo({
                                top: Math.max(0, targetScrollTop),
                                behavior: 'smooth'
                            });
                        }
                        matched = true;
                        break;
                    }
                }
            }

            if (!matched) {
                setHighlightRects([]);
            }
        };

        // Delay execution slightly to ensure react-pdf renders textLayer spans
        const timeoutId = setTimeout(() => {
            if (!active) return;
            performHighlight();

            // Observe dynamic DOM changes in the textLayer (PDF.js lazy-loading)
            const textLayer = document.querySelector('[class*="textLayer"]') as HTMLElement;
            if (textLayer) {
                observer = new MutationObserver(() => {
                    performHighlight();
                });
                observer.observe(textLayer, { childList: true, subtree: true });
            }
        }, 300);

        return () => {
            active = false;
            clearTimeout(timeoutId);
            if (observer) {
                observer.disconnect();
            }
        };
    }, [activeResult, currentPage, scale]);

    return (
        <div style={containerStyle}>
            {highlightRects.map((rect, idx) => (
                <div
                    key={idx}
                    className="pdf-highlight-overlay"
                    style={{
                        position: 'absolute',
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                        pointerEvents: 'none',
                    }}
                />
            ))}
            <style>{`
                .pdf-highlight-overlay {
                    background-color: rgba(24, 90, 219, 0.25) !important;
                    border-bottom: 2px solid rgba(24, 90, 219, 0.8) !important;
                    border-radius: 1.5px !important;
                    box-shadow: 0 1px 3px rgba(24, 90, 219, 0.15) !important;
                    animation: highlight-pulse 1.5s ease-out infinite alternate;
                    mix-blend-mode: multiply;
                }

                @keyframes highlight-pulse {
                    0% {
                        background-color: rgba(24, 90, 219, 0.2);
                        box-shadow: 0 1px 3px rgba(24, 90, 219, 0.1);
                    }
                    100% {
                        background-color: rgba(24, 90, 219, 0.3);
                        box-shadow: 0 1px 6px rgba(24, 90, 219, 0.25);
                    }
                }
            `}</style>
        </div>
    );
}
