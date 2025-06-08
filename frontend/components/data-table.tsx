import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {ColumnDef, flexRender, getCoreRowModel, OnChangeFn, useReactTable} from "@tanstack/react-table";
import {Button} from "@/components/ui/button";
import {ArrowLeft, ArrowRight} from "lucide-react";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"


export default function DataTable({data, columns, total = 0, pageSizeOptions = [25, 50, 100, 150, 200], pagination, onPaginate}: {data: any[], columns: ColumnDef<any>[], total: number, pageSizeOptions?: number[], pagination: {pageIndex: number, pageSize: number}, onPaginate: OnChangeFn<any>}) {

    const table = useReactTable({
        data: data,
        columns: columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        rowCount: total,
        onPaginationChange: onPaginate,
        state: {
            pagination
        }
    })

    return(
        <>
            <div className="rounded-md border">
                <Table className="rounded relative">
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} style={{width: header.getSize()}}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} style={{width: cell.column.getSize()}} className={"relative"}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

            </div>
            <div className="flex items-center justify-end space-x-2 py-4 px-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.setPageIndex(0)}
                    disabled={pagination.pageIndex == 0}
                >
                    <ArrowLeft size={10} />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    <ArrowLeft size={10} />
                    Previous
                </Button>

                <span>
                    {pagination.pageIndex + 1} / {Math.ceil(total/ pagination.pageSize)}
                </span>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Next
                    <ArrowRight size={10} />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.setPageIndex(Math.ceil(total/ pagination.pageSize) - 1)}
                    disabled={pagination.pageIndex == Math.ceil(total/ pagination.pageSize) - 1}
                >
                    <ArrowRight size={10} />
                </Button>
                <Select defaultValue={String(table.getState().pagination.pageSize)}
                        onValueChange={value => {
                            table.setPageSize(Number(value))
                        }}
                >
                    <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Page Size" />
                    </SelectTrigger>
                    <SelectContent>
                        {pageSizeOptions.map(pageSize => (
                            <SelectItem key={pageSize} value={String(pageSize)}>
                                {pageSize}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </>
    )
}