"use client";
import Editor from '@monaco-editor/react';
import {Button} from "@/components/ui/button";
import {useEffect, useState} from "react";
import {getScriptCode} from "@/apis";

export default function CodeEditor({scriptId, language = "python"}: {scriptId: string, language: string}) {

    const [value, setValue] = useState<string>("");

    useEffect(() => {
        const fetchScript = async () => {
            try {
                const res = await getScriptCode(scriptId)
                if(res){
                    setValue(res);
                }
            }catch (e) {
                console.error(e);
            }
        }

        void fetchScript();
    }, []);

    return(
        <div className={"w-[650px] space-y-4"}>
            <div className={"flex space-x-2"}>
                <p>Editing Language: </p>
                <pre>{language}</pre>
            </div>
            <Editor height={"70vh"}
                    width={"100%"}
                    defaultLanguage={language}
                    value={value}
                    theme={"vs-dark"}
                    onChange={(v) => setValue(v ? v : "")}

            />
            <Button className={"hover:cursor-pointer"}>
                Save Changes
            </Button>
        </div>
    )
}