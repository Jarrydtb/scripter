import {Drawer, DrawerContent, DrawerHeader, DrawerTitle} from "@/components/ui/drawer";
import {Button} from "@/components/ui/button";
import {X} from "lucide-react";
import {Scheduled} from "@/interfaces";
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {createSchedule, updateSchedule,} from "@/apis";
import {toast} from "sonner";
import {getChangedFields} from "@/lib/utils";
import { isValidCron } from "cron-validator";

type Props = {
    open: boolean,
    scriptId: string,
    onClose: () => void,
    onRefresh: () => void,
}

const formSchema = z.object({
    cron: z.string().refine(value => isValidCron(value, {seconds: false}), {
        message: "Invalid cron expression",
    }),
    state: z.boolean()
});

export default function CreateScheduleDrawer({open, scriptId, onClose, onRefresh}: Props) {


    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            cron: "",
            state: false
        }
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {

        try{
            await createSchedule(scriptId, {...values, cron: values.cron.trim()});
            toast.success("Schedule created successfully.");
            onRefresh();
        }catch (e) {
            if(typeof e == "string"){
                toast.error(e as string, {
                    closeButton: true
                });
            }
        }

    }

    return (
        <>
            {(open && !!scriptId) && (
                <Drawer open={open}
                        onOpenChange={(open) => {
                            if(!open) {
                                onClose();
                            }}}
                >
                    <DrawerContent>
                        <div className="mx-auto w-full max-w-sm space-y-2 flex flex-col gap-3">
                            <DrawerHeader className={'p-0 mb-2'}>
                                <DrawerTitle>
                                    <div className={"flex justify-between items-center"}>
                                        <div className={"flex items-center justify-center gap-2 shadow-sm"}>
                                            <p style={{fontSize: '1.5rem'}}>Create Schedule</p>
                                        </div>
                                        <Button size={"icon"} variant={"outline"} className={"hover:cursor-pointer"} onClick={() => {
                                            onClose();
                                        }}>
                                            <X size={8} />
                                        </Button>
                                    </div>
                                </DrawerTitle>
                            </DrawerHeader>
                            <div className="flex justify-center items-center space-x-2">
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-[650px]">
                                        <FormField
                                            control={form.control}
                                            name="cron"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Cron String" {...field} autoComplete={"off"}/>
                                                    </FormControl>
                                                    <FormDescription>
                                                        Please enter a cron string to determine its schedule.
                                                        <br />
                                                        Use <a href={"https://crontab.guru/"} target={"_blank"} rel={"noreferrer noopener"} className={"text-blue-400"}> Crontab Guru</a> for reference.
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button className={'w-full hover:cursor-pointer'}>
                                            Create
                                        </Button>
                                    </form>
                                </Form>
                            </div>
                            <div className={"h-[20px]"} />
                        </div>

                    </DrawerContent>
                </Drawer>
            )}
        </>
    )
}