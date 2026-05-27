import { useBackendHelper } from '@/config/backend_helper';
import React, { useEffect, useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

function formatBytes(bytes: string | number, decimals = 2) {
    if (!+bytes) return '0 Bytes'
    const numBytes = Number(bytes);
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(numBytes) / Math.log(k))
    return `${parseFloat((numBytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function ListHistory({ type }: { type: string }) {
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(false);
    const { getAnalyseHistory, getSearchHistory } = useBackendHelper()
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');
    const [totalPages, setTotalPages] = useState(1);

    // Reset page to 1 whenever the type or search query changes
    useEffect(() => {
        setPage(1);
    }, [type, search]);

    useEffect(() => {
        async function getAnalyseHistoryData() {
            setLoading(true);
            try {
                const response = await getAnalyseHistory(page, limit, search);
                console.log(response)
                if (response.status === 200 && response.data.success) {
                    setHistoryData(response.data.data);

                    // Attempt to extract total pages or total count from backend response
                    const total = response.data.total || response.data.totalCount || response.data.pagination?.total;
                    const resTotalPages = response.data.totalPages || response.data.pagination?.totalPages;

                    if (resTotalPages) {
                        setTotalPages(resTotalPages);
                    } else if (total !== undefined) {
                        setTotalPages(Math.ceil(total / limit));
                    } else {
                        // Fallback: If we don't know the exact total, adjust totalPages dynamically
                        if (response.data.data.length < limit) {
                            setTotalPages(page);
                        } else {
                            setTotalPages(prev => Math.max(prev, page + 1));
                        }
                    }
                }
                else {
                    setHistoryData([])
                }
            } finally {
                setLoading(false);
            }
        }

        async function getSearchHistoryData() {
            setLoading(true);
            try {
                const response = await getSearchHistory(page, limit, search);
                console.log(response)
                if (response.status === 200 && response.data.success) {
                    setHistoryData(response.data.data);

                    const total = response.data.total || response.data.totalCount || response.data.pagination?.total;
                    const resTotalPages = response.data.totalPages || response.data.pagination?.totalPages;

                    if (resTotalPages) {
                        setTotalPages(resTotalPages);
                    } else if (total !== undefined) {
                        setTotalPages(Math.ceil(total / limit));
                    } else {
                        if (response.data.data.length < limit) {
                            setTotalPages(page);
                        } else {
                            setTotalPages(prev => Math.max(prev, page + 1));
                        }
                    }
                }
                else {
                    setHistoryData([])
                }
            } finally {
                setLoading(false);
            }
        }
        if (type === 'resume') {
            getAnalyseHistoryData();
        }
        else {
            getSearchHistoryData()
        }
    }, [type, page, limit, search, getAnalyseHistory, getSearchHistory])

    const getPageNumbers = () => {
        const pages = [];
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (page <= 3) {
                for (let i = 1; i <= 4; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            } else if (page >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push('...');
                pages.push(page - 1);
                pages.push(page);
                pages.push(page + 1);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <div className="w-full rounded-md border shadow-sm mt-4 bg-card overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50 border-b">
                        <TableHead className="w-[250px] font-bold text-sm text-foreground">File Name</TableHead>
                        <TableHead className="font-bold text-sm text-foreground">Date</TableHead>
                        {type === 'resume' ? (
                            <>
                                <TableHead className="font-bold text-sm text-foreground">Size</TableHead>
                                <TableHead className="font-bold text-sm text-foreground">Match Score</TableHead>
                                <TableHead className="max-w-[300px] font-bold text-sm text-foreground">Description</TableHead>
                            </>
                        ) : (
                            <TableHead className="max-w-[400px] font-bold text-sm text-foreground">Search Query</TableHead>
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                            </TableCell>
                        </TableRow>
                    ) : historyData.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground font-normal">
                                No history found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        historyData.map((data: Record<string, any>, index: number) => (
                            <TableRow key={data.id || index} className="hover:bg-muted/30 transition-colors border-b">
                                <TableCell>
                                    <p className="text-sm font-normal text-foreground">
                                        {data.file_name || "-"}
                                    </p>
                                </TableCell>
                                <TableCell>
                                    <p className="text-sm font-normal text-muted-foreground">
                                        {data.created_at ? format(new Date(data.created_at), "MMM d, yyyy h:mm a") : '-'}
                                    </p>
                                </TableCell>
                                {type === 'resume' ? (
                                    <>
                                        <TableCell>
                                            <p className="text-sm font-normal text-muted-foreground">
                                                {data.file_size ? formatBytes(Number(data.file_size)) : '-'}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            {data.similarity_score !== undefined && data.similarity_score !== null ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-full max-w-[80px] bg-secondary/60 rounded-full h-2">
                                                        <div
                                                            className="bg-primary h-2 rounded-full"
                                                            style={{ width: `${Math.min(100, data.similarity_score * 100)}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-xs font-normal text-muted-foreground">
                                                        {(data.similarity_score * 100).toFixed(1)}%
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-sm font-normal text-muted-foreground">-</p>
                                            )}
                                        </TableCell>
                                        <TableCell className="max-w-[250px]" title={data.job_description}>
                                            <p className="text-sm font-normal text-muted-foreground truncate">
                                                {data.job_description || '-'}
                                            </p>
                                        </TableCell>
                                    </>
                                ) : (
                                    <TableCell className="max-w-[350px]" title={data.search_query || data.query}>
                                        <p className="text-sm font-normal text-muted-foreground truncate">
                                            {data.search_query || data.query || '-'}
                                        </p>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 border-t gap-4">
                <div className="text-sm font-semibold text-muted-foreground">
                    Showing page {page} of {totalPages} {historyData.length > 0 ? `(${historyData.length} items)` : ''}
                </div>
                <div className="flex items-center space-x-1">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                        className="mr-2"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Prev
                    </Button>

                    {getPageNumbers().map((pageNum, idx) => (
                        pageNum === '...' ? (
                            <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
                        ) : (
                            <Button
                                key={`page-${pageNum}`}
                                variant={page === pageNum ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => setPage(pageNum as number)}
                                disabled={loading}
                                className="w-9 px-0"
                            >
                                {pageNum}
                            </Button>
                        )
                    ))}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= totalPages || loading}
                        className="ml-2"
                    >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default ListHistory
