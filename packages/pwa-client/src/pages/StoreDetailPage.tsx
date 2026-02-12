import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function StoreDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/store" aria-label="Back to store">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{slug}</h1>
          <p className="text-muted-foreground">Skill details</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="versions">Versions</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">
                    Skill description and documentation will be loaded from ClawHub.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="versions">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">
                    Version history will be displayed here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="permissions">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">
                    Required permissions will be listed here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Install</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full">Install Skill</Button>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Version: 1.0.0</p>
                <p>Author: --</p>
                <p>Category: --</p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">placeholder</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
