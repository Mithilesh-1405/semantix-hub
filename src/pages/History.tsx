import ListHistory from '@/components/ListHistory'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import React from 'react'

function History() {

    return (
        <div className="w-full">
            <Tabs defaultValue="resume-polish" className="w-full">

                <TabsList className="mb-4">
                    <TabsTrigger value="resume-polish">Resume Polish</TabsTrigger>
                    <TabsTrigger value="search-pdf">Search PDF</TabsTrigger>
                </TabsList>

                <TabsContent value="resume-polish">
                    <ListHistory type="resume"/>
                </TabsContent>

                <TabsContent value="search-pdf">
                    <ListHistory type="other"/>
                </TabsContent>

            </Tabs>
        </div>
    )
}

export default History
