import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { BookOpen, GraduationCap, Award, Users, Loader2, ExternalLink, Sparkles, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type LearningResourcesProps = {
  idpId: number;
  objectives: any[];
  existingResources?: any[];
};

export default function LearningResources({ idpId, objectives, existingResources }: LearningResourcesProps) {
  const { t } = useTranslation();
  const [resources, setResources] = useState(existingResources || null);

  const generateResourcesMutation = trpc.idp.getLearningResources.useMutation({
    onSuccess: (data) => {
      setResources(data.resources);
      toast.success(t("learningResourcesGeneratedSuccess"));
    },
    onError: () => {
      toast.error(t("learningResourcesGenerationError"));
    },
  });

  const updateResourcesMutation = trpc.idp.updateLearningResources.useMutation({
    onSuccess: (data) => {
      setResources(data.resources);
      toast.success(t("learningResourcesSaved"));
    },
    onError: () => {
      toast.error(t("learningResourcesSaveError"));
    },
  });

  const handleGenerate = () => {
    generateResourcesMutation.mutate({ idpId, objectives });
  };

  const updateResourceItem = (
    resourceIndex: number,
    group: "courses" | "books" | "certifications" | "workshops",
    itemIndex: number,
    field: string,
    value: string
  ) => {
    setResources((current: any[] | null) => {
      if (!current) return current;
      return current.map((resource, index) => {
        if (index !== resourceIndex) return resource;
        return {
          ...resource,
          [group]: resource[group].map((item: any, itemIdx: number) =>
            itemIdx === itemIndex ? { ...item, [field]: value } : item
          ),
        };
      });
    });
  };

  const removeResourceItem = (
    resourceIndex: number,
    group: "courses" | "books" | "certifications" | "workshops",
    itemIndex: number
  ) => {
    setResources((current: any[] | null) => {
      if (!current) return current;
      return current.map((resource, index) => {
        if (index !== resourceIndex) return resource;
        return {
          ...resource,
          [group]: resource[group].filter((_: any, itemIdx: number) => itemIdx !== itemIndex),
        };
      });
    });
  };

  const handleSaveResources = () => {
    updateResourcesMutation.mutate({ idpId, resources: resources || [] });
  };

  if (!resources) {
    return (
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('learningResourceRecommendations')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground mb-6">
            {t('learningResourcesDescription')}
          </p>
          <Button
            onClick={handleGenerate}
            disabled={generateResourcesMutation.isPending}
            size="icon"
            className="transition-all duration-300 hover:scale-105"
            aria-label={t("generateLearningResources")}
            title={t("generateLearningResources")}
          >
            {generateResourcesMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end print:hidden">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleSaveResources}
          disabled={updateResourcesMutation.isPending}
          aria-label={t("saveLearningResources")}
          title={t("saveLearningResources")}
        >
          {updateResourcesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
      </div>
      {resources.map((resource: any, index: number) => (
        <Card key={index} className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg">
              {t("resourcesFor", { title: resource.objectiveTitle })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="courses" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="courses" className="flex items-center gap-1">
                  <GraduationCap className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('resourceTabCourses')}</span>
                </TabsTrigger>
                <TabsTrigger value="books" className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('resourceTabBooks')}</span>
                </TabsTrigger>
                <TabsTrigger value="certifications" className="flex items-center gap-1">
                  <Award className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('resourceTabCertifications')}</span>
                </TabsTrigger>
                <TabsTrigger value="workshops" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('resourceTabWorkshops')}</span>
                </TabsTrigger>
              </TabsList>

	              <TabsContent value="courses" className="space-y-4 mt-4">
	                {resource.courses.map((course: any, i: number) => (
                  <div
                    key={i}
                    className="border border-border rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:border-primary/50"
                  >
                    <div className="flex items-start justify-between gap-4">
	                      <div className="flex-1">
	                        <input
	                          value={course.title}
	                          onChange={(event) => updateResourceItem(index, "courses", i, "title", event.target.value)}
	                          className="mb-1 w-full rounded border border-transparent bg-transparent font-semibold text-foreground focus:border-border focus:bg-background focus:px-2 focus:py-1 focus:outline-none print:border-transparent"
	                        />
	                        <textarea
	                          value={course.description}
	                          onChange={(event) => updateResourceItem(index, "courses", i, "description", event.target.value)}
	                          className="mb-2 w-full resize-none rounded border border-transparent bg-transparent text-sm text-muted-foreground focus:border-border focus:bg-background focus:px-2 focus:py-1 focus:outline-none print:border-transparent"
	                          rows={2}
	                        />
	                        <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded">
	                          {course.platform}
	                        </span>
	                      </div>
	                      <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeResourceItem(index, "courses", i)}
                          className="print:hidden"
                          aria-label={t("remove")}
                          title={t("remove")}
                        >
	                        <Trash2 className="h-4 w-4" />
	                      </Button>
	                      <Button
                        variant="outline"
                        size="icon"
                        asChild
                        className="flex-shrink-0"
                      >
                        <a href={course.url} target="_blank" rel="noopener noreferrer" aria-label={course.title} title={course.title}>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="books" className="space-y-4 mt-4">
	                {resource.books.map((book: any, i: number) => (
                  <div
                    key={i}
                    className="border border-border rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:border-primary/50"
                  >
	                    <div className="flex items-start justify-between gap-3">
	                      <input
	                        value={book.title}
	                        onChange={(event) => updateResourceItem(index, "books", i, "title", event.target.value)}
	                        className="mb-1 w-full rounded border border-transparent bg-transparent font-semibold text-foreground focus:border-border focus:bg-background focus:px-2 focus:py-1 focus:outline-none print:border-transparent"
	                      />
	                      <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeResourceItem(index, "books", i)}
                          className="print:hidden"
                          aria-label={t("remove")}
                          title={t("remove")}
                        >
	                        <Trash2 className="h-4 w-4" />
	                      </Button>
	                    </div>
	                    <p className="text-sm text-muted-foreground mb-2">{t("byAuthor", { author: book.author })}</p>
	                    <textarea
	                      value={book.description}
	                      onChange={(event) => updateResourceItem(index, "books", i, "description", event.target.value)}
	                      className="w-full resize-none rounded border border-transparent bg-transparent text-sm text-foreground focus:border-border focus:bg-background focus:px-2 focus:py-1 focus:outline-none print:border-transparent"
	                      rows={2}
	                    />
	                  </div>
                ))}
              </TabsContent>

              <TabsContent value="certifications" className="space-y-4 mt-4">
                {resource.certifications.map((cert: any, i: number) => (
                  <div
                    key={i}
                    className="border border-border rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:border-primary/50"
                  >
                    <div className="flex items-start gap-3">
                      <Award className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
	                      <div className="flex-1">
	                        <input
	                          value={cert.title}
	                          onChange={(event) => updateResourceItem(index, "certifications", i, "title", event.target.value)}
	                          className="mb-1 w-full rounded border border-transparent bg-transparent font-semibold text-foreground focus:border-border focus:bg-background focus:px-2 focus:py-1 focus:outline-none print:border-transparent"
	                        />
	                        <p className="text-sm text-muted-foreground mb-2">{cert.provider}</p>
	                        <textarea
	                          value={cert.description}
	                          onChange={(event) => updateResourceItem(index, "certifications", i, "description", event.target.value)}
	                          className="w-full resize-none rounded border border-transparent bg-transparent text-sm text-foreground focus:border-border focus:bg-background focus:px-2 focus:py-1 focus:outline-none print:border-transparent"
	                          rows={2}
	                        />
	                      </div>
	                      <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeResourceItem(index, "certifications", i)}
                          className="print:hidden"
                          aria-label={t("remove")}
                          title={t("remove")}
                        >
	                        <Trash2 className="h-4 w-4" />
	                      </Button>
	                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="workshops" className="space-y-4 mt-4">
                {resource.workshops.map((workshop: any, i: number) => (
                  <div
                    key={i}
                    className="border border-border rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:border-primary/50"
                  >
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
	                      <div className="flex-1">
	                        <input
	                          value={workshop.title}
	                          onChange={(event) => updateResourceItem(index, "workshops", i, "title", event.target.value)}
	                          className="mb-1 w-full rounded border border-transparent bg-transparent font-semibold text-foreground focus:border-border focus:bg-background focus:px-2 focus:py-1 focus:outline-none print:border-transparent"
	                        />
	                        <textarea
	                          value={workshop.description}
	                          onChange={(event) => updateResourceItem(index, "workshops", i, "description", event.target.value)}
	                          className="w-full resize-none rounded border border-transparent bg-transparent text-sm text-foreground focus:border-border focus:bg-background focus:px-2 focus:py-1 focus:outline-none print:border-transparent"
	                          rows={2}
	                        />
	                      </div>
	                      <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeResourceItem(index, "workshops", i)}
                          className="print:hidden"
                          aria-label={t("remove")}
                          title={t("remove")}
                        >
	                        <Trash2 className="h-4 w-4" />
	                      </Button>
	                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
