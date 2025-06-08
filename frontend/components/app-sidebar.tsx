"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
    SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar"
import {FileCode2, Container} from "lucide-react";
import {usePathname} from "next/navigation";

// Menu items.
const items = [
    // {
    //     title: "Home",
    //     url: "/",
    //     icon: Home,
    // },
    {
        title: "Scripts",
        url: "/scripts",
        icon: FileCode2,
    },
    {
        title: "Images",
        url: "/images",
        icon: Container,
    }
]

export function AppSidebar() {

    const pathname = usePathname();

    return (
        <Sidebar>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Application</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild isActive={(() => {
                                        return item.url.split("/").slice(1,2)[0] == pathname.split("/").slice(1,2)[0]
                                    })()}>
                                        <a href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}
