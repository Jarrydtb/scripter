"use client";
import {ColumnDef} from "@tanstack/react-table"
import {useEffect, useState} from "react";
import DataTable from "@/components/data-table";
import {useRouter} from "next/navigation";
import {buildImage, deleteImage, destroyImage, getImages} from "@/apis";
import {Image} from "@/interfaces";
import {ImageDropDown} from "@/app/images/image_dropdown";
import ImageLogs from "@/app/images/image_logs";
import {ImageStatus} from "@/app/images/enums";
import {toast} from "sonner";
import {router} from "next/client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";





export function ImageTable() {

    const router = useRouter();

    const [imageLogs, setImageLogs] = useState<Image|null>(null);
    const [destroy, setDestroy] = useState<Image|null>(null);
    const [delImage, setDelImage] = useState<Image|null>(null);
    const [data, setData] = useState<Image[]>([])
    const [total, setTotal] = useState<number>(0)
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 100
    })

    useEffect(() => {
        async function fetchData(){
            const images = await getImages(pagination.pageIndex, pagination.pageSize);
            setData(images.images)
            setTotal(images.total)
        }
        void fetchData();
    }, [pagination]);

    const onBuildImage = async (imageId: string) => {
        try {
            await buildImage(imageId);
            setPagination(prevState => ({...prevState, pageIndex: prevState.pageIndex}))
            toast.info("Image build started.")
        }catch (e: unknown) {
            toast.error(e as string);
            return Promise.reject(e)
        }
    }

    const onDeleteImage = async (imageId: string) => {
        try {
            await deleteImage(imageId);
            setPagination(prevState => ({...prevState, pageIndex: prevState.pageIndex}))
            toast.success("Image deleted.")
            setDelImage(null)
        }catch (e: unknown) {
            toast.error(e as string);
            return Promise.reject(e)
        }
    }

    const onDestroy = async (imageId: string) => {
        try {
            await destroyImage(imageId);
            setPagination(prevState => ({...prevState, pageIndex: prevState.pageIndex}))
            toast.success("Image destroyed.")
            setDestroy(null)
        }catch (e: unknown) {
            toast.error(e as string);
            return Promise.reject(e)
        }
    }

    const columns: ColumnDef<Image>[] = [
        {
            accessorKey: "name",
            header: "Name",
        },
        {
            accessorKey: "description",
            header: "Description",
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({row}) => (
                <div className={row.original.status  == ImageStatus.BUILD_SUCCESS ? "text-green-200" : row.original.status == ImageStatus.BUILD_FAILED ? "text-red-200" : "text-orange-200"}>
                    {ImageStatus[row?.original?.status] ?? "UNKNOWN"}
                </div>),
        },
        {
            accessorKey: "options",
            header: "Options",
            cell: ({row}) => <div>
                <ImageDropDown image={row.original}
                               onBuild={(imageId: string) => {
                                   void onBuildImage(imageId);
                               }}
                               onLogs={() => {
                                  setImageLogs(row.original)
                               }}
                               onDelete={() => {
                                  setDelImage(row.original)
                               }}
                               onEdit={(imageId: string) => {
                                   router.push(`/images/${imageId}/edit`)
                               }}
                               onDestroy={() => {
                                   setDestroy(row.original)
                               }}
                />
            </div>,
            size: 60,
            minSize: 45,
            maxSize: 60
        }
    ]


    return (
        <>
            <DataTable data={data}
                       columns={columns}
                       pagination={pagination}
                       total={total}
                       onPaginate={setPagination}
            />


            {
                imageLogs && <ImageLogs open={!!imageLogs} image={imageLogs} onClose={() => {
                    setImageLogs(null);
                }} />
            }

            {
                destroy && (
                    <Dialog open={true} onOpenChange={() => setDestroy(null)}>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Confirmation</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to destroy this image:
                                </DialogDescription>
                                <DialogDescription>
                                    <i>&quot;{destroy.name}&quot;</i>
                                </DialogDescription>
                                <DialogDescription>
                                    If you destroy this image, the state will be changed to dormant, the image will be deleted from the docker env, and all associated scripts&apos; schedules will be disabled.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button type="button" className={"hover:cursor-pointer bg-red-800 text-red-200 hover:bg-red-700"} onClick={() => onDestroy(destroy?.id)}>Yes, destroy this image</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )
            }

            {
                delImage && (
                    <Dialog open={true} onOpenChange={() => setDelImage(null)}>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Confirmation</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to delete this image:
                                </DialogDescription>
                                <DialogDescription>
                                    <i>&quot;{delImage.name}&quot;</i>
                                </DialogDescription>
                                <DialogDescription>
                                    This action is irreversible.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button type="button" className={"hover:cursor-pointer bg-red-800 text-red-200 hover:bg-red-700"} onClick={() => onDeleteImage(delImage?.id)}>Yes, delete this image</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )
            }

        </>

    )
}


