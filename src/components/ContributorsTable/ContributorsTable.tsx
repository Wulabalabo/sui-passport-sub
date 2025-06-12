"use client";

import { useMediaQuery } from "react-responsive";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "../ui/input";
import { getMobileColumns } from "./mobileColumns";
import { type Contributor, getColumns } from "./columns";
import { Button } from "../ui/button";
import { cn } from "~/lib/utils";
import { UserProfileModal } from "../ProfileModal/UserProfileModal";

interface ContributorsTableProps<TData, TValue> {
  data: TData[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function ContributorsTable<TData, TValue>({
  data,
  isLoading,
  onRefresh,
}: ContributorsTableProps<TData, TValue>) {
  const [globalFilter, setGlobalFilter] = useState<ColumnFiltersState>([]);
  const [filterValue, setFilterValue] = useState<string>("");
  const [tableHeight, setTableHeight] = useState(0);
  const [showLoader, setShowLoader] = useState(false);

  const [currentUserAddress, setCurrentUserAddress] = useState<string | null>(
    null,
  );

  const tableRef = useRef<HTMLTableElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      timerRef.current = setTimeout(() => setShowLoader(true), 300);
      if (tableRef.current) setTableHeight(tableRef.current.offsetHeight);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      setShowLoader(false);
    }

    return () => clearTimeout(timerRef.current as NodeJS.Timeout);
  }, [isLoading]);

  const handleOpenUserProfile = useCallback(
    (address: string) => () => {
      setCurrentUserAddress(address);
    },
    [],
  );

  const handleCloseUserProfile = useCallback(() => {
    setCurrentUserAddress(null);
  }, []);

  const isMobile = useMediaQuery({ query: `(max-width: 760px)` });
  const tableColumns = (
    isMobile ? getMobileColumns() : getColumns(handleOpenUserProfile)
  ) as ColumnDef<TData, TValue>[];

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      globalFilter,
      columnVisibility: isMobile ? { stampsCollected: false } : {},
    },
  });

  return (
    <>
      <div className="flex flex-col items-center">
        <div className="w-full max-w-[1000px] px-4 mb-2">
          <p className="text-center font-everett_light text-[14px] text-[#ABBDCC] mb-4 sm:text-[16px]">
            To keep things fair, anyone with duplicate stamps or found gaming the system will be removed from the leaderboard.
            <br className="hidden sm:block" />
          <span className="block sm:inline mt-2 sm:mt-0">
            Your stamps will still appear on your profile, but it won’t count toward leaderboard rankings.
         </span>
         </p>
        </div>
         <div className="relative flex items-center w-[358px] sm:w-[1000px] justify-center">
          <div className="relative flex items-center">
            {!filterValue && (
              <Image
                src={"/images/search.png"}
                alt="search"
                width={20}
                height={20}
                className="absolute left-[63px] sm:left-[52px]"
              />
            )}
            <Input
              className="h-[44px] w-[358px] rounded-3xl bg-[#ABBDCC1A] text-center font-inter text-[14px] text-[#ABBDCC80] sm:h-[52px] sm:w-[360px] sm:text-[16px]"
              placeholder="Search by address or name"
              value={filterValue}
              onChange={(event) => {
                table.setGlobalFilter(event.target.value);
                setFilterValue(event.target.value ?? "");
              }}
            />
          </div>
          <Button
            onClick={onRefresh}
            variant="outline"
            disabled={isLoading}
            className="absolute right-0 top-1/2 -translate-y-1/2"
          >
            <Image
              src={"/images/refresh.svg"}
              className={cn({
                "animate-spin": isLoading,
              })}
              alt="refresh"
              width={16}
              height={16}
            />
          </Button>
        </div>
        {showLoader ? (
          <div
            className="mt-12 flex justify-center font-inter text-[16px] text-[#ABBDCC]"
            style={{ height: tableHeight || "auto" }}
          >
            <div className="mt-40 flex items-start gap-2">
              <Image
                src={"/images/loader.svg"}
                className="animate-spin"
                width={24}
                height={24}
                alt="loader"
              />
              Wait a sec, we’re still loading
            </div>
          </div>
        ) : (
          <div
            ref={tableRef}
            className="relative mt-12 flex w-[358px] flex-col items-center justify-center font-inter sm:w-[1000px] sm:[&_tbody]:before:block sm:[&_tbody]:before:h-[34px] sm:[&_tbody]:before:content-['']"
          >
            <div className="absolute top-0 hidden h-[60px] w-[1000px] rounded-lg bg-black bg-opacity-20 sm:block" />
            <Table className="border-separate border-spacing-y-2 sm:border-collapse">
              <TableHeader className="hidden h-[60px] sm:table-header-group">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead
                          key={header.id}
                          className="text-white"
                          style={{
                            width: `${header.getSize()}px`,
                            maxWidth: `${header.getSize()}px`,
                          }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      );
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
                      onClick={
                        isMobile
                          ? handleOpenUserProfile(
                              (row.original as Contributor).address,
                            )
                          : undefined
                      }
                      className="overflow-hidden rounded-2xl sm:[&_button]:hover:flex sm:[&_span]:hover:left-[-110px]"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="bg-[#ABBDCC1A] px-1 first:rounded-l-2xl first:pl-2 last:rounded-r-2xl last:pr-2 sm:bg-transparent"
                          style={{
                            width: `${cell.column.getSize()}px`,
                            maxWidth: `${cell.column.getSize()}px`,
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={tableColumns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      {currentUserAddress && (
        <UserProfileModal
          address={currentUserAddress}
          onClose={handleCloseUserProfile}
        />
      )}
    </>
  );
}
