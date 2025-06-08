import {Bomb, Delete, Edit, Hammer, Logs, MoreHorizontal} from "lucide-react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {Image} from "@/interfaces";
import {ImageStatus} from "@/app/images/enums";
import {router} from "next/client";

type DropDownProps = {
    image: Image;
    onBuild: (imageId: string) => void;
    onLogs: (imageId: string) => void;
    onDelete: (imageId: string) => void;
    onEdit: (imageId: string) => void;
    onDestroy: (imageId: string) => void;
}

export function ImageDropDown({image, onBuild, onLogs, onDelete, onEdit, onDestroy}: DropDownProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild >
                <button className="p-1 border rounded w-[30px] justify-center flex hover:bg-[#383838]"><MoreHorizontal size={16} /> </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" side={"bottom"}>
                <DropdownMenuLabel><i>{image.name}</i></DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    {
                        image.status == ImageStatus.DORMANT && (
                            <DropdownMenuItem className={"hover:bg-[#383838]"}>
                                <div className="flex gap-2 items-center hover:cursor-pointer w-full" onClick={() => onBuild(image.id)}>
                                    <Hammer size={16}/>
                                    Build
                                </div>
                            </DropdownMenuItem>
                        )
                    }

                    {
                        image.status != ImageStatus.DORMANT && (
                            <>
                                <DropdownMenuItem className={"hover:bg-[#383838]"}>
                                    <div className="flex gap-2 items-center hover:cursor-pointer w-full" onClick={() => onLogs(image.id)}>
                                        <Logs size={16}/>
                                        See logs
                                    </div>
                                </DropdownMenuItem>

                            </>
                        )
                    }


                <DropdownMenuItem className={"hover:bg-[#383838]"}>
                    <div className="flex gap-2 items-center hover:cursor-pointer w-full" onClick={() => onEdit(image.id)}>
                        <Edit size={16}/>
                        Edit Image
                    </div>
                </DropdownMenuItem>

                </DropdownMenuGroup>
                <DropdownMenuSeparator />

                {
                    image.status == ImageStatus.BUILD_SUCCESS && (
                        <DropdownMenuItem className={"hover:bg-[#383838]"}>
                            <div className="flex gap-2 items-center hover:cursor-pointer w-full text-orange-400" onClick={() => onDestroy(image.id)}>
                                <Bomb size={16} className={"text-orange-400"}/>
                                Destroy Image
                            </div>
                        </DropdownMenuItem>
                    )
                }
                <DropdownMenuItem className={"hover:bg-red-400/20"}>
                    <div className="flex gap-2 items-center text-red-400 hover:cursor-pointer w-full" onClick={() => onDelete(image.id)}>
                        <Delete size={16} className={"text-red-400"}/>
                        Delete
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
