import {Drawer, DrawerContent, DrawerHeader, DrawerTitle} from "@/components/ui/drawer";
import {Button} from "@/components/ui/button";
import {X} from "lucide-react";
import {LoadingSpinner} from "@/components/loading-spinner";
import {useEffect, useState} from "react";
import {Image, ImageLog} from "@/interfaces";
import {getImageLogs} from "@/apis";
import {ImageStatus} from "@/app/images/enums";

export default function ImageLogs({open, image, onClose}: {open: boolean, image: Image|null, onClose: () => void }) {

    const [loading, setLoading] = useState(true);
    const [logContent, setLogContent] = useState<string[] | null>(null);
    const [nextPosition, setNextPosition] = useState<number>(0)

    const fetchLogContent = async (id: string, position: number = 0): Promise<ImageLog> => {
        try {
            return Promise.resolve(await getImageLogs(id, position))
        } catch (e) {
            setLogContent(["Error fetching log content"]);
            setLoading(false)
            return Promise.reject(e);
        }
    }

    useEffect(() => {
        let interval: NodeJS.Timeout;
        let previousNextPosition: number | null = null;

        const pollLogs = async () => {
            if (!image?.id) return;
            try {
                const {lines, new_position} = await fetchLogContent(image.id, nextPosition);
                if(new_position !== previousNextPosition){
                    setLogContent(prev => [...(prev ? prev : []), ...lines])
                    previousNextPosition = new_position;
                    setNextPosition(new_position);
                }else{
                    setLoading(false)
                    clearInterval(interval)
                }
            }catch (error){
                console.error(error)
                clearInterval(interval)
            }
        }

        // Initial fetch
        if (image?.id) {
            void pollLogs();
            interval = setInterval(pollLogs, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [image]);

    return(
        <>
            {(open && !!image) && (
                <Drawer open={open}
                        onOpenChange={(open) => {
                            if(!open) {
                                setLoading(true)
                                setNextPosition(0)
                                setLogContent(null)
                                onClose();
                            }}}
                >
                    <DrawerContent>
                        <DrawerHeader>
                            <DrawerTitle>
                                <div className={"flex justify-between items-center"}>
                                    <div className={"flex items-center justify-center gap-2 shadow-sm"}>
                                        <p className={image.status == ImageStatus.BUILD_SUCCESS ? "text-green-200" : image.status == ImageStatus.BUILDING  ?  "text-orange-200" : "text-red-200"}>
                                            {ImageStatus[image.status]}
                                        </p>
                                    </div>
                                    <Button size={"icon"} variant={"outline"} className={"hover:cursor-pointer"} onClick={() => {
                                        setNextPosition(0);
                                        setLogContent(null);
                                        setLoading(true);
                                        onClose();
                                    }}>
                                        <X size={8} />
                                    </Button>
                                </div>
                            </DrawerTitle>
                        </DrawerHeader>
                        <div className="p-4">

                            {logContent && (
                                <div className="p-4 bg-black/50 border rounded" style={{maxHeight: "50vh", overflowY: "auto"}}>
                                    {logContent.map((item, i) => (
                                        <pre key={i}>{item}</pre>
                                    ))}
                                    {(loading && (
                                        <div className="flex items-center justify-center">
                                            <LoadingSpinner />
                                        </div>
                                    ))}
                                </div>
                            )}

                        </div>
                        <div className={"h-[20px]"} />
                    </DrawerContent>
                </Drawer>
            )}
        </>
    )
}