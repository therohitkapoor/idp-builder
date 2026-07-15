import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { extraTranslations } from '@/lib/extraTranslations';
import { translateReportText } from '@/lib/reportTranslation';
import type { LanguageCode } from '@/components/LanguageSelector';

const resources: Record<string, { translation: Record<string, string> }> = {
  en: {
    translation: {
      // Common
      welcome: "Welcome to IDP Builder",
      welcomeDescription: "Create comprehensive Individual Development Plans tailored to your career goals using AI-powered analysis of your training needs, assessments, and coaching reports.",
      chooseLanguage: "Choose Your Preferred Language",
      continueInEnglish: "Continue in English",
      selectEnglish: "Select English",
      continueInArabic: "المتابعة بالعربية",
      selectArabic: "اختر العربية",
      languagePreferenceNote: "Your language preference will be saved for your session. You can change it anytime from the settings.",
      
      // Navigation
      home: "Home",
      dashboard: "Dashboard",
      myIDPs: "My IDPs",
      createNew: "Create New IDP",
      settings: "Settings",
      logout: "Logout",
      
      // Home Page
      getStarted: "Get Started",
      createYourIDP: "Create Your Individual Development Plan",
      howItWorks: "How It Works",
      step1Title: "Upload Documents",
      step1Description: "Upload your training needs analysis, assessments, and coaching reports",
      step2Title: "AI Analysis",
      step2Description: "Our AI analyzes your documents and identifies key development areas",
      step3Title: "Generate IDP",
      step3Description: "Get a comprehensive development plan with SMART objectives and timeline",
      heroTitle: "Want to build an IDP? I am here to help!",
      heroDescription: "Create a comprehensive Individual Development Plan tailored to your career goals using AI-powered analysis of your training needs, assessments, and coaching reports.",
      myDashboard: "My Dashboard",
      
      // Tabs
      whatIsIdp: "What is an IDP?",
      howToBenefit: "How to Benefit",
      methodology702010: "70-20-10 Methodology",
      
      // What is IDP Tab
      whatIsIdpTitle: "What is an Individual Development Plan (IDP)?",
      whatIsIdpDesc1: "An Individual Development Plan (IDP) is a strategic document that outlines your professional development goals and the specific actions needed to achieve them. It serves as a roadmap for your career growth, helping you identify skill gaps, set measurable objectives, and track your progress over time.",
      whatIsIdpDesc2: "A well-crafted IDP aligns your personal career aspirations with organizational objectives, ensuring mutual benefit for both you and your employer. It typically includes short-term and long-term goals, specific development activities, timelines, and success metrics.",
      selfAssessment: "Self-Assessment",
      selfAssessmentDesc: "Evaluate your current skills, strengths, and areas for improvement",
      goalSetting: "Goal Setting",
      goalSettingDesc: "Define clear, measurable objectives aligned with your career path",
      actionPlanning: "Action Planning",
      actionPlanningDesc: "Create specific steps and timelines to achieve your goals",
      
      // Benefits Tab
      howToBenefitTitle: "How to Benefit from This IDP",
      forEmployees: "For Employees",
      forOrganizations: "For Organizations",
      benefitEmployee1: "Gain clarity on your career direction and development priorities",
      benefitEmployee2: "Receive personalized recommendations based on your unique profile",
      benefitEmployee3: "Track progress with measurable objectives and milestones",
      benefitEmployee4: "Build a comprehensive development portfolio for career advancement",
      benefitOrg1: "Align employee development with business objectives",
      benefitOrg2: "Improve employee engagement and retention through growth opportunities",
      benefitOrg3: "Build a skilled workforce ready for future challenges",
      benefitOrg4: "Create a culture of continuous learning and improvement",
      
      // 70-20-10 Tab
      methodology702010Title: "The 70-20-10 Learning Methodology",
      methodology702010Desc: "The 70-20-10 model is a widely recognized framework for effective learning and development. It suggests that learning occurs through a blend of different experiences:",
      experientialLearning: "Experiential Learning",
      experientialDesc: "Learning through hands-on experience and on-the-job challenges",
      stretchAssignments: "Stretch assignments",
      jobRotations: "Job rotations",
      leadingProjects: "Leading projects",
      problemSolving: "Problem-solving tasks",
      socialLearning: "Social Learning",
      socialDesc: "Learning from and with others through collaboration",
      mentoring: "Mentoring relationships",
      coachingSessions: "Coaching sessions",
      peerFeedback: "Peer feedback",
      networkingEvents: "Networking events",
      formalLearning: "Formal Learning",
      formalDesc: "Structured educational programs and training",
      onlineCourses: "Online courses",
      workshops: "Workshops & seminars",
      certifications: "Certifications",
      reading: "Reading & research",
      
      // IDP Form
      createIDPTitle: "Create Individual Development Plan",
      personalInformation: "Personal Information",
      employeeDetails: "Employee Details",
      fullName: "Full Name",
      employeeName: "Employee Name",
      position: "Position",
      company: "Company",
      department: "Department",
      yearsOfExperience: "Years of Experience",
      dateOfJoining: "Date of Joining",
      dateOfIdpCreation: "Date of IDP Creation",
      directManager: "Direct Manager",
      uploadDocuments: "Upload Documents",
      organizationLogo: "Organization Logo",
      trainingNeeds: "Training Needs Analysis",
      assessmentReports: "Assessment Reports",
      coachingReports: "Coaching Reports",
      manualInput: "Manual Input / Additional Notes",
      dragDropFiles: "Drag and drop files here, or click to select",
      generateIDP: "Generate IDP",
      generating: "Generating...",
      viewDashboard: "View Dashboard",
      previewIDP: "Preview IDP",
      
      // Dashboard
      myDevelopmentPlans: "My Development Plans",
      createNewIDP: "Create New IDP",
      inProgress: "In Progress",
      completed: "Completed",
      notStarted: "Not Started",
      overallProgress: "Overall Progress",
      viewDetails: "View Details",
      noIDPsFound: "No IDPs found",
      getStartedMessage: "Get started by creating your first Individual Development Plan",
      
      // IDP Report
      idpReport: "Individual Development Plan",
      executiveSummary: "Executive Summary",
      keyStrengths: "Key Strengths",
      keyDevelopment: "Key Development Areas",
      developmentObjectives: "Development Objectives",
      objectivesNavigator: "Objectives Navigator",
      progressTracking: "Progress Tracking",
      employeeInformation: "Employee Information",
      developmentGaps: "Development Gaps",
      keyDevelopmentGaps: "Key Development Gaps",
      summaryRecommendations: "Summary & Recommendations",
      summaryCollectiveAdvice: "Summary & Collective Advice",
      saveAsPDF: "Save as PDF",
      saveAsExcel: "Save as Excel",
      finalizePublishIdp: "Finalize / publish IDP",
      idpFinalizedPublished: "IDP finalized and published.",
      idpFinalizeError: "Unable to finalize this IDP.",
      backToDashboard: "Back to Dashboard",
      update: "Update",
      save: "Save",
      cancel: "Cancel",
      idpGeneratedMessage: "This Individual Development Plan was generated using the Emeritus IDP Builder",
      downloadPDF: "Download PDF",
      shareIDP: "Share IDP",
      shareViaEmail: "Share via Email",
      generatedOn: "Generated on",
      keyStrengthAreas: "Key Strength Areas",
      developmentActivities: "Development Activities (70-20-10)",
      experientialLearningPercent: "Experiential Learning - 70%",
      socialLearningPercent: "Social Learning - 20%",
      formalLearningPercent: "Formal Learning - 10%",
      
      // GROW Model
      growModel: "GROW Model",
      coachingFramework: "Coaching Framework",
      growModelDescription: "A structured approach to achieve your development objectives through goal-setting, reality-checking, exploring options, and committing to action.",
      growGoal: "Goal",
      growReality: "Reality",
      growOptions: "Options",
      growWill: "Will",
      growWillDo: "Will Do",
      growTip: "Tip:",
      growTipDescription: "Use this GROW framework to structure your development conversations with your manager and track progress toward your objectives.",
      
      // Development Objectives Section
      developmentObjectivesIntro: "The following measurable objectives have been identified based on your profile and inputs:",
      objective: "Objective",
      objectiveDescription: "Description",
      successMetrics: "Success Metrics",
      learningResourceRecommendations: "Learning Resource Recommendations",
      generateLearningResources: "Generate Learning Resources",
      learningResourcesDescription: "Get personalized course, book, and certification recommendations for your objectives",
      resourceTabCourses: "Courses",
      resourceTabBooks: "Books",
      resourceTabCertifications: "Certifications",
      resourceTabWorkshops: "Workshops",
      approvalSignatures: "Approval Signatures",
      employeeSignature: "Employee Signature",
      managerSignature: "Manager Signature",
      executiveEducationQuestion: "Curious to explore training options in collaboration with Top business schools and universities?",
      executiveEducationDescription: "Discover executive education programs from world-renowned institutions tailored to your development needs.",
      
      // Criticality Levels
      critical: "Critical",
      high: "High",
      medium: "Medium",
      low: "Low",
      
      // Progress Tracking
      status: "Status",
      progress: "Progress",
      deadline: "Deadline",
      setDeadline: "Set deadline",
      dragSliderToUpdate: "Drag the slider to update progress",
      
      // Common Actions
      delete: "Delete",
      edit: "Edit",
      view: "View",
      back: "Back",
      next: "Next",
      submit: "Submit",
      loading: "Loading...",
      error: "Error",
      success: "Success",
    }
  },
  ar: {
    translation: {
      // Common
      welcome: "مرحباً بك في بناء خطة التطوير الفردية",
      welcomeDescription: "أنشئ خطط تطوير فردية شاملة مصممة خصيصاً لأهدافك المهنية باستخدام التحليل المدعوم بالذكاء الاصطناعي لاحتياجاتك التدريبية والتقييمات وتقارير التوجيه.",
      chooseLanguage: "اختر لغتك المفضلة",
      continueInEnglish: "Continue in English",
      selectEnglish: "Select English",
      continueInArabic: "المتابعة بالعربية",
      selectArabic: "اختر العربية",
      languagePreferenceNote: "سيتم حفظ تفضيل اللغة الخاص بك لجلستك. يمكنك تغييره في أي وقت من الإعدادات.",
      
      // Navigation
      home: "الرئيسية",
      dashboard: "لوحة التحكم",
      myIDPs: "خطط التطوير الخاصة بي",
      createNew: "إنشاء خطة جديدة",
      settings: "الإعدادات",
      logout: "تسجيل الخروج",
      
      // Home Page
      getStarted: "ابدأ الآن",
      createYourIDP: "أنشئ خطة التطوير الفردية الخاصة بك",
      howItWorks: "كيف يعمل",
      step1Title: "تحميل المستندات",
      step1Description: "قم بتحميل تحليل احتياجاتك التدريبية والتقييمات وتقارير التوجيه",
      step2Title: "التحليل بالذكاء الاصطناعي",
      step2Description: "يقوم الذكاء الاصطناعي بتحليل مستنداتك وتحديد مجالات التطوير الرئيسية",
      step3Title: "إنشاء خطة التطوير",
      step3Description: "احصل على خطة تطوير شاملة مع أهداف ذكية وجدول زمني",
      heroTitle: "هل تريد بناء خطة تطوير فردية؟ أنا هنا للمساعدة!",
      heroDescription: "أنشئ خطة تطوير فردية شاملة مصممة خصيصًا لأهدافك المهنية باستخدام التحليل المدعوم بالذكاء الاصطناعي لاحتياجاتك التدريبية والتقييمات وتقارير التوجيه.",
      myDashboard: "لوحة التحكم الخاصة بي",
      
      // Tabs
      whatIsIdp: "ما هي خطة التطوير الفردية‏؟",
      howToBenefit: "المميزات",
      methodology702010: "منهجية 70-20-10",
      
      // What is IDP Tab
      whatIsIdpTitle: "ما هي خطة التطوير الفردية‏؟",
      whatIsIdpDesc1: "خطة التطوير الفردية هي وثيقة استراتيجية تحدد أهداف تطويرك المهني والإجراءات المحددة اللازمة لتحقيقها. إنها تعمل كخارطة طريق لنموك الوظيفي، مما يساعدك على تحديد فجوات المهارات ووضع أهداف قابلة للقياس وتتبع تقدمك بمرور الوقت",
      whatIsIdpDesc2: "توائم خطة التطوير الفردية الجيدة بين طموحاتك المهنية الشخصية وأهداف المؤسسة، مما يضمن الفائدة المتبادلة لك ولصاحب العمل. عادةً ما تتضمن أهدافًا قصيرة وطويلة الأجل، وأنشطة تطوير محددة، وجداول زمنية، ومقاييس النجاح",
      selfAssessment: "التقييم الذاتي",
      selfAssessmentDesc: "قيّم مهاراتك الحالية ونقاط قوتك ومجالات التحسين",
      goalSetting: "تحديد الأهداف",
      goalSettingDesc: "حدد أهدافًا واضحة وقابلة للقياس متوافقة مع مسارك المهني",
      actionPlanning: "تخطيط العمل",
      actionPlanningDesc: "أنشئ خطوات محددة وجداول زمنية لتحقيق أهدافك",
      
      // Benefits Tab
      howToBenefitTitle: "كيفية الاستفادة من خطة التطوير هذه",
      forEmployees: "للموظفين",
      forOrganizations: "للمؤسسات",
      benefitEmployee1: "اكتسب وضوحًا بشأن اتجاه حياتك المهنية وأولويات التطوير",
      benefitEmployee2: "احصل على توصيات مخصصة بناءً على ملفك الشخصي الفريد",
      benefitEmployee3: "تتبع التقدم من خلال أهداف ومعالم قابلة للقياس",
      benefitEmployee4: "بناء محفظة تطوير شاملة للتقدم الوظيفي",
      benefitOrg1: "مواءمة تطوير الموظفين مع أهداف العمل",
      benefitOrg2: "تحسين مشاركة الموظفين والاحتفاظ بهم من خلال فرص النمو",
      benefitOrg3: "بناء قوة عاملة ماهرة جاهزة للتحديات المستقبلية",
      benefitOrg4: "خلق ثقافة التعلم والتحسين المستمر",
      
      // 70-20-10 Tab
      methodology702010Title: "منهجية التعلم 70-20-10",
      methodology702010Desc: "نموذج 70-20-10 هو إطار معترف به على نطاق واسع للتعلم والتطوير الفعال. يقترح أن التعلم يحدث من خلال مزيج من التجارب المختلفة‏:",
      experientialLearning: "التعلم بالتجربة",
      experientialDesc: "التعلم من خلال الخبرة العملية والتحديات أثناء العمل",
      stretchAssignments: "المهام التحديّة",
      jobRotations: "التناوب الوظيفي",
      leadingProjects: "قيادة المشاريع",
      problemSolving: "مهام حل المشكلات",
      socialLearning: "التعلم الاجتماعي",
      socialDesc: "التعلم من الآخرين ومعهم من خلال التعاون",
      mentoring: "علاقات الإرشاد",
      coachingSessions: "جلسات التدريب",
      peerFeedback: "ملاحظات الأقران",
      networkingEvents: "فعاليات التواصل",
      formalLearning: "التعلم الرسمي",
      formalDesc: "البرامج التعليمية والتدريبية المنظمة",
      onlineCourses: "الدورات عبر الإنترنت",
      workshops: "ورش العمل والندوات",
      certifications: "الشهادات المهنية",
      reading: "القراءة والبحث",
      
      // IDP Form
      createIDPTitle: "إنشاء خطة التطوير الفردية",
      personalInformation: "المعلومات الشخصية",
      employeeDetails: "تفاصيل الموظف",
      fullName: "الاسم الكامل",
      employeeName: "اسم الموظف",
      position: "المنصب",
      company: "الشركة",
      department: "القسم",
      yearsOfExperience: "سنوات الخبرة",
      dateOfJoining: "تاريخ الالتحاق",
      dateOfIdpCreation: "تاريخ إنشاء خطة التطوير",
      directManager: "المدير المباشر",
      
      // Input Placeholders
      enterFullName: "أدخل اسمك الكامل",
      enterJobTitle: "أدخل المسمى الوظيفي",
      enterCompanyName: "أدخل اسم الشركة",
      enterDepartment: "أدخل القسم",
      enterYearsExp: "مثلاً، 5",
      enterManagerName: "أدخل اسم المدير",
      enterManualInput: "أدخل أي معلومات إضافية أو مجالات تطوير محددة...",
      
      uploadDocuments: "تحميل المستندات",
      organizationLogo: "شعار المؤسسة",
      trainingNeeds: "تحليل الاحتياجات التدريبية",
      assessmentReports: "تقارير التقييم",
      coachingReports: "تقارير التوجيه",
      manualInput: "إدخال يدوي / ملاحظات إضافية",
      
      // Upload Descriptions
      logoUploadDesc: "قم بتحميل شعار مؤسستك لعرضه في تقرير خطة التطوير المُنشأة",
      clickUploadLogo: "انقر لتحميل شعار المؤسسة",
      logoFormats: "PNG, JPG, SVG (بحد أقصى 5 ميجابايت)",
      documentsUploadDesc: "قم بتحميل مستندات مثل تحليل الاحتياجات التدريبية، تقارير التوجيه، تقارير التقييم، أو أي ملفات أخرى ذات صلة",
      clickUploadDocs: "انقر للتحميل أو اسحب وأفلت",
      docFormats: "PDF, DOC, DOCX, TXT (بحد أقصى 10 ميجابايت لكل ملف)",
      manualInputDesc: "أدخل يدويًا أي فجوات في المهارات، مجالات التطوير، أو عناصر قائمة الرغبات التي ترغب في تضمينها في خطة التطوير الخاصة بك",
      
      dragDropFiles: "اسحب وأفلت الملفات هنا، أو انقر للاختيار",
      generateIDP: "إنشاء خطة التطوير",
      generating: "جاري الإنشاء...",
      viewDashboard: "عرض لوحة التحكم",
      previewIDP: "معاينة خطة التطوير",
      
      // Dashboard
      myDevelopmentPlans: "خطط التطوير الخاصة بي",
      createNewIDP: "إنشاء خطة تطوير جديدة",
      inProgress: "قيد التنفيذ",
      completed: "مكتمل",
      notStarted: "لم يبدأ",
      overallProgress: "التقدم الإجمالي",
      viewDetails: "عرض التفاصيل",
      noIDPsFound: "لم يتم العثور على خطط تطوير",
      getStartedMessage: "ابدأ بإنشاء خطة التطوير الفردية الأولى",
      
      // IDP Report
      idpReport: "خطة التطوير الفردية",
      executiveSummary: "الملخص التنفيذي",
      keyStrengths: "نقاط القوة الرئيسية",
      keyDevelopment: "مجالات التطوير الرئيسية",
      developmentObjectives: "الأهداف التطويرية",
      objectivesNavigator: "متصفح الأهداف",
      progressTracking: "تتبع التقدم",
      employeeInformation: "معلومات الموظف",
      developmentGaps: "فجوات التطوير",
      keyDevelopmentGaps: "فجوات التطوير الرئيسية",
      summaryRecommendations: "الملخص والتوصيات",
      summaryCollectiveAdvice: "الملخص والنصائح الجماعية",
      saveAsPDF: "حفظ كـ PDF",
      saveAsExcel: "حفظ كـ Excel",
      finalizePublishIdp: "إنهاء / نشر خطة التطوير",
      idpFinalizedPublished: "تم إنهاء خطة التطوير ونشرها.",
      idpFinalizeError: "تعذر إنهاء خطة التطوير هذه.",
      backToDashboard: "العودة إلى لوحة التحكم",
      update: "تحديث",
      save: "حفظ",
      cancel: "إلغاء",
      idpGeneratedMessage: "تم إنشاء خطة التطوير الفردية هذه باستخدام أداة بناء خطط التطوير من Emeritus",
      downloadPDF: "تحميل PDF",
      shareIDP: "مشاركة الخطة",
      shareViaEmail: "مشاركة عبر البريد الإلكتروني",
      generatedOn: "تم إنشاؤه في",
      keyStrengthAreas: "مجالات القوة الرئيسية",
      developmentActivities: "أنشطة التطوير (70-20-10)",
      experientialLearningPercent: "التعلم بالتجربة - 70%",
      socialLearningPercent: "التعلم الاجتماعي - 20%",
      formalLearningPercent: "التعلم الرسمي - 10%",
      
      // GROW Model
      growModel: "نموذج (GROW)",
      coachingFramework: "إطار التدريب",
      growModelDescription: "نهج منظم لتحقيق أهدافك التطويرية من خلال تحديد الأهداف، وفحص الواقع، واستكشاف الخيارات، والالتزام بالعمل.",
      growGoal: "الهدف (Goal)",
      growReality: "الواقع (Reality)",
      growOptions: "الخيارات (Options)",
      growWill: "الإرادة (Will)",
      growWillDo: "سأفعل (Will Do)",
      growTip: "نصيحة:",
      growTipDescription: "استخدم إطار GROW لتنظيم محادثاتك التطويرية مع مديرك وتتبع التقدم نحو أهدافك.",
      
      // Development Objectives Section
      developmentObjectivesIntro: "تم تحديد الأهداف القابلة للقياس التالية بناءً على ملفك الشخصي ومدخلاتك:",
      objective: "الهدف",
      objectiveDescription: "الوصف",
      successMetrics: "مؤشرات النجاح",
      learningResourceRecommendations: "مصادر التعلم المرشحة",
      generateLearningResources: "البدء في عملية الترشيح",
      learningResourcesDescription: "احصل على توصيات مخصصة للدورات والكتب والشهادات التي تناسب أهدافك",
      resourceTabCourses: "الدورات",
      resourceTabBooks: "الكتب",
      resourceTabCertifications: "الشهادات",
      resourceTabWorkshops: "ورش العمل",
      approvalSignatures: "توقيعات الاعتماد",
      employeeSignature: "توقيع الموظف",
      managerSignature: "توقيع المدير",
      executiveEducationQuestion: "هل ترغب في استكشاف خيارات التدريب بالتعاون مع أفضل كليات إدارة الأعمال والجامعات؟",
      executiveEducationDescription: "اكتشف برامج التعليم التنفيذي من مؤسسات عالمية مرموقة مصممة خصيصًا لتلبية احتياجاتك التطويرية.",
      
      // Criticality Levels
      critical: "حرج",
      high: "عالي",
      medium: "متوسط",
      low: "منخفض",
      
      // Progress Tracking
      status: "الحالة",
      progress: "التقدم",
      deadline: "الموعد النهائي",
      setDeadline: "تحديد الموعد النهائي",
      dragSliderToUpdate: "اسحب شريط التمرير لتحديث التقدم",
      
      // Common Actions
      delete: "حذف",
      edit: "تعديل",
      view: "عرض",
      back: "رجوع",
      next: "التالي",
      submit: "إرسال",
      loading: "جاري التحميل...",
      error: "خطأ",
      success: "نجح",
    }
  }
};

for (const [language, translation] of Object.entries(extraTranslations)) {
  const existingTranslations = resources[language]?.translation ?? {};
  resources[language] = {
    translation: {
      ...resources.en.translation,
      ...existingTranslations,
      ...translation,
    },
  };
}

for (const [language, resource] of Object.entries(resources)) {
  if (language === 'en') continue;
  const activeLanguage = language as LanguageCode;

  for (const [key, value] of Object.entries(resource.translation)) {
    const englishValue = resources.en.translation[key];
    if (value === englishValue) {
      resource.translation[key] = translateReportText(value, activeLanguage);
    }
  }
}

const storedPreferredLanguage = localStorage.getItem('preferredLanguage');
const initialInterfaceLanguage =
  storedPreferredLanguage && resources[storedPreferredLanguage] ? storedPreferredLanguage : 'en';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: Object.keys(resources),
    lng: initialInterfaceLanguage,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
