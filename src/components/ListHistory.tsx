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
import { Loader2 } from "lucide-react"

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
    const { getPolishHistory, getSearchHistory } = useBackendHelper()
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');

    useEffect(() => {
        async function getPolishHistoryData() {
            setLoading(true);
            try {
                const response = await getPolishHistory(page, limit, search);
                console.log(response)
                if (response.status === 200 && response.data.success) {
                    setHistoryData(response.data.data);
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
                }
                else {
                    setHistoryData([])
                }
            } finally {
                setLoading(false);
            }
        }
        if (type === 'resume') {
            getPolishHistoryData();
        }
        else {
            getSearchHistoryData()
        }
    }, [type, page, limit, search, getPolishHistory, getSearchHistory])

    return (
        <div className="w-full rounded-md border shadow-sm mt-4 bg-card overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/60">
                        <TableHead className="w-[250px] font-semibold">File Name</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Size</TableHead>
                        <TableHead className="font-semibold">Match Score</TableHead>
                        <TableHead className="max-w-[300px] font-semibold">Description</TableHead>
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
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                No history found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        historyData.map((data: Record<string, any>, index: number) => (
                            <TableRow key={data.id || index} className="hover:bg-muted/40 transition-colors">
                                <TableCell className="font-medium text-foreground">
                                    {data.file_name || "-"}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {data.created_at ? format(new Date(data.created_at), "MMM d, yyyy h:mm a") : '-'}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {data.file_size ? formatBytes(Number(data.file_size)) : '-'}
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
                                            <span className="text-xs font-medium text-muted-foreground">
                                                {(data.similarity_score * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    ) : '-'}
                                </TableCell>
                                <TableCell className="max-w-[250px] truncate text-muted-foreground" title={data.job_description}>
                                    {data.job_description || '-'}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}

export default ListHistory
