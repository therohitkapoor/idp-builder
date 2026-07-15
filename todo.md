# IDP Builder - Project TODO

## Landing Page
- [x] Emeritus logo and branding
- [x] Welcome message "Want to build an IDP? I am here to help!"
- [x] Tab 1: Introduction to IDP
- [x] Tab 2: How to benefit from this IDP
- [x] Tab 3: 70-20-10 Methodology infographic

## Employee Details Form
- [x] Employee Name field
- [x] Company field
- [x] Department field
- [x] Years of Experience field
- [x] Date of Joining field
- [x] Date of IDP Creation field
- [x] Direct Manager field

## File Upload
- [x] Upload button "Upload Your Input Files"
- [x] Support multiple file uploads
- [x] Support PDF, Word, and text documents
- [x] Store files in S3

## Manual Input
- [x] Free text input area for gaps/wishlist

## IDP Generation
- [x] "Develop My IDP" button
- [x] Processing status indicator
- [x] AI-powered file analysis
- [x] Extract content from uploaded documents
- [x] Generate measurable objectives
- [x] Generate 70-20-10 recommendations (3+ per category per objective)
- [x] Generate summary advice

## IDP Output Page
- [x] "Your IDP is Ready!" message
- [x] "Preview Your IDP" button
- [x] Employee Information Section
- [x] Measurable Objectives list
- [x] Detailed IDP with 70-20-10 breakdown
- [x] Summary section with collective advice
- [x] PDF download button

## Database
- [x] IDP records table
- [x] Employee details storage
- [x] Generated IDP content storage

## New Features (v2)
- [x] Add Position field to employee details
- [x] Help chatbot on landing page
- [x] Hover animations throughout the app
- [x] Key Strengths chart in IDP output
- [x] Key Gaps chart in IDP output

## New Features (v3)
- [x] AI Coaching Assistant with personalized advice
- [x] Learning Resource Recommendations (Coursera, Udemy, LinkedIn Learning)
- [x] IDP Dashboard to view all generated IDPs
- [x] Dashboard completion statistics
- [x] Email sharing functionality for IDPs
- [x] Email notifications for progress updates
- [x] Progress tracking system (Not Started, In Progress, Completed)
- [x] Percentage completion indicators for objectives
- [x] Enhanced chart visualizations with better styling
- [x] Interactive chart features

## Bug Fixes & Enhancements (v4)
- [x] Add annotation "Click to Consult your AI Personal Coach" to AI Coach button
- [x] Add scrollbar to AI Coach dialog for long responses
- [x] Fix PDF download functionality
- [x] Enhance progress tracking functionality
- [x] Update chart hover effects to show only percentage (no text)
- [x] Move Learning Resources section to bottom of IDP view

## Bug Fixes (v5)
- [x] Fix PDF download OKLCH color format error

## New Features (v6)
- [x] Replace PDF download with browser print dialog (Ctrl+P)
- [x] Add deadline calendar picker for each objective
- [x] Store objective deadlines in database

## New Features (v7)
- [x] Add organization logo upload field on landing page
- [x] Store organization logo URL in database
- [x] Display organization logo in IDP report header

## New Features (v8)
- [x] Add database fields for employee and manager signatures
- [x] Create signature drawing component with canvas
- [x] Add signature fields to IDP report
- [x] Save signatures to database
- [x] Display signatures in print view

## New Features (v9)
- [x] Add side panel with objectives navigation
- [x] Make objectives clickable to scroll to details
- [x] Increase number of objectives from 3 to 5
- [x] Add criticality meter to each objective
- [x] Color-code criticality levels (Low/Medium/High/Critical)
- [x] AI determines criticality based on gap analysis

## New Features & Changes (v10)
- [x] Add "Save as Excel" button next to Save as PDF
- [x] Implement Excel export functionality with all IDP data
- [x] Remove Emeritus logo from side panel navigator (not present)
- [x] Add executive education section before Learning Resources
- [x] Add "Browse Executive Education Catalog" button with link
- [x] Make AI coach button blink with animation
- [x] Add annotation "AI Coach from Here" with scribble arrow above AI coach

## Visual Edits (v11)
- [x] Remove Emeritus logo from IDP title section (keep only organization logo)

## New Features & Fixes (v12)
- [x] Fix chart hover effects - remove gray rectangle, animate bars on hover
- [x] Number objectives in the navigator side panel
- [x] Add GROW Model interactive diagram before summary section
- [x] Make Update button more visible with green background

## Language Selection Landing Page (v13)
- [x] Create new landing page with welcome message and admin login
- [x] Add two prominent language selection buttons (English and Spanish)
- [x] Update routing to show language selection before main IDP builder
- [x] Store language preference for user session

## Language Selection Page Fixes (v13.1)
- [x] Fix Emeritus logo display issue
- [x] Change language options from English/Spanish to English/Arabic

## Language Selection Page Updates (v13.2)
- [x] Update logo to new Emeritus version with tagline
- [x] Change English card to show UK flag instead of GB
- [x] Update Arabic card to show multiple GCC country flags (Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, Oman)

## Flag Display Fix (v13.3)
- [x] Replace emoji flags with actual flag images for proper rendering
- [x] Download UK and GCC country flag images
- [x] Update language cards to display flag images instead of emojis

## Individual GCC Flags (v13.4)
- [x] Search for individual flag icons for each GCC country
- [x] Download separate flag images for Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, Oman
- [x] Display flags in horizontal row on Arabic language card

## UK Flag Transparent Background (v13.5)
- [x] Search for circular UK flag icon with transparent background
- [x] Replace current UK flag to match GCC flag style

## UK Flag Clean Circular Icon (v13.6)
- [x] Find UK flag with truly circular shape and no square background
- [x] Replace to match GCC flag icon style perfectly

## Use User-Provided UK Flag (v13.7)
- [x] Copy user-provided UK flag to public folder
- [x] Verify flag displays correctly

## Full Arabic RTL Implementation (v14)
- [x] Install i18next library for internationalization
- [x] Create Arabic translation files for all UI text
- [x] Implement RTL layout switching based on language selection
- [x] Translate all page content (Home, Dashboard, Forms, Reports)
- [x] Update AI prompts to generate content in Arabic when Arabic is selected
- [x] Apply RTL styling to all components (navigation, forms, tables, charts)
- [x] Test complete Arabic user flow from language selection to IDP generation

## Fix Arabic Translation Display (v14.1)
- [x] Update LanguageSelection page to use translation hooks
- [x] Update Home page to use translation hooks
- [x] Update Dashboard page to use translation hooks
- [x] Update IdpView page to use translation hooks
- [x] Verify Arabic text displays correctly after language selection

## Revert Landing Page to English (v14.2)
- [x] Remove translation hooks from LanguageSelection page
- [x] Keep landing page text in English only
- [x] Ensure Arabic translation applies only after clicking Arabic button
- [x] Update Home page to pass language parameter to backend for Arabic IDP generation

## Complete UI Translation (v15)
- [x] Expand Arabic translations in i18n configuration for all UI elements
- [x] Update Home page form labels and buttons with translation functions
- [x] Update Dashboard page navigation and content with translation functions
- [x] Update IDP view page with translation functions for all sections
- [x] Test complete Arabic UI experience from start to finish

## Translate Home Page Informational Content (v15.1)
- [x] Add Arabic translations for tab titles and content sections
- [x] Translate "What is an IDP?" section
- [x] Translate "Benefits" section (For Employees and For Organizations)
- [x] Translate "70-20-10" learning methodology section
- [x] Update Home page to use translation functions for all static content

## Comprehensive Arabic Translation Audit (v16)
- [x] Audit Home page for untranslated content (Benefits bullet points, 70-20-10 examples)
- [x] Audit Dashboard page for missing translations
- [x] Audit IDP View page for missing translations
- [x] Audit all form components and buttons
- [x] Verify RTL layout is properly applied across all pages
- [x] Test navigation and user flow in Arabic

## Fix Remaining English Text in Arabic Mode (v16.1)
- [x] Translate tab button labels (IDP, Benefits, 70-20-10)
- [x] Translate all input placeholders in the form
- [x] Verify all UI elements display in Arabic when Arabic is selected

## Translate Remaining Descriptive Text (v16.2)
- [x] Translate main form heading "Create Your Individual Development Plan"
- [x] Translate organization logo upload description and button text
- [x] Translate document upload description and button text
- [x] Translate file format specifications
- [x] Translate manual input description

## Logo Clickable and Flag Size Fixes (v17)
- [x] Make Emeritus logo clickable to return to landing page
- [x] Unify Saudi Arabia flag size with other GCC flags
- [x] Unify Oman flag size with other GCC flags

## RTL Fixes for Arabic Mode (v18)
- [x] Fix bulleted items to display RTL in Arabic mode
- [x] Update "Benefits" translation to "المميزات"
- [x] Ensure tab buttons display RTL in Arabic mode

## Tab Order and Icon Position Fixes (v19)
- [x] Swap tab order in Arabic mode (display as: 70-20-10, المميزات, ما هي خطة التطوير الفردية؟)
- [x] Move icons to the right side of text in Arabic mode

## Landing Page Fixes (v20)
- [x] Use the correct UK flag (user-provided version)
- [x] Swap language card positions (English on left, Arabic on right)
- [x] Fix Oman flag to be circular shape matching other GCC flags
- [x] Fix Saudi Arabia flag size to match other GCC flags exactly

## Tab Icon Position Fix (v21)
- [x] Fix tab icons to appear on the right side of text in Arabic mode (currently showing on left despite flex-row-reverse)

## Arabic Punctuation Fix (v22)
- [x] Fix question mark in "ما هي خطة التطوير الفردية؟" title to display at end of sentence
- [x] Fix colon in "نموذج 70-20-10:" title to display at end of sentence
- [x] Add Unicode RLM (Right-to-Left Mark) to force proper punctuation rendering in all browsers

## Visual Editor Changes (v24)
- [x] Center-align Arabic text paragraphs in "What is IDP" tab section

## Report Page Arabic Translation and RTL (v25)
- [x] Translate "Individual Development Plan" title to Arabic
- [x] Translate "Generated on" date label to Arabic
- [x] Translate "Employee Information" section title to Arabic
- [x] Translate "Key Development Gaps" and "Key Strength Areas" titles to Arabic
- [x] Translate "Objectives Navigator" title to Arabic
- [x] Translate "Development Activities (70-20-10)" section title to Arabic
- [x] Translate "Experiential Learning", "Social Learning", "Formal Learning" headers to Arabic
- [x] Apply RTL alignment to all report page sections
- [x] Apply RTL alignment to employee information fields
- [x] Apply RTL alignment to objectives navigator
- [x] Apply RTL alignment to development activities sections

## Chart RTL Layout Fix (v26)
- [x] Fix horizontal bar charts (Key Strength Areas and Key Development Gaps) to display RTL in Arabic mode
- [x] Move Y-axis labels to the right side in Arabic mode
- [x] Reverse bar direction to grow from right to left in Arabic mode

## Translation Update (v27)
- [x] Update "Development Objectives" translation to "الأهداف التطويرية"

## GROW Model Translation (v28)
- [x] Translate "Coaching Framework" to Arabic
- [x] Translate "GROW Model" to Arabic with English acronym in brackets
- [x] Translate GROW Model description to Arabic
- [x] Translate all GROW step titles (Goal, Reality, Options, Will Do) with English in brackets
- [x] Add RTL support to GROW Model diagram

## Development Objectives Section Translation (v29)
- [x] Translate "Development Objectives" to "الأهداف التطويرية"
- [x] Translate "The following measurable objectives..." to "تم تحديد الأهداف القابلة للقياس التالية بناءً على ملفك الشخصي ومدخلاتك:"
- [x] Translate "Objective 1/2/3..." to "الهدف 1/2/3..."
- [x] Translate "Progress Tracking" to "متابعة التقدم" (already existed)
- [x] Translate "Description" to "الوصف"
- [x] Translate "Success Metrics" to "مؤشرات النجاح"
- [x] Translate "Summary & Collective Advice" to "الخلاصة والتوصيات" (already existed as summaryCollectiveAdvice)

## Missing Translations Fix (v30)
- [x] Add "Description" label translation in objectives detail section (الوصف)
- [x] Translate "Learning Resource Recommendations" to "مصادر التعلم المرشحة"
- [x] Translate "Generate Learning Resources" button to "البدء في عملية الترشيح"

## Additional Arabic Translations (v31)
- [x] Translate learning resources description "Get personalized course, book..." to "احصل على توصيات مخصصة للدورات والكتب والشهادات التي تناسب أهدافك"
- [x] Translate "Approval Signatures" to "توقيعات الاعتماد"
- [x] Translate "Employee Signature" to "توقيع الموظف"
- [x] Translate "Manager Signature" to "توقيع المدير"
- [x] Translate executive education promotional question to "هل ترغب في استكشاف خيارات التدريب بالتعاون مع أفضل كليات إدارة الأعمال والجامعات؟"
- [x] Translate executive education description to "اكتشف برامج التعليم التنفيذي من مؤسسات عالمية مرموقة مصممة خصيصًا لتلبية احتياجاتك التطويرية."

## Chart Bar Radius Flip (v32)
- [x] Flip bar chart border radius in Arabic mode so curved side appears on the left instead of right

## Criticality Level Translation (v33)
- [x] Add Arabic translations for criticality levels: Critical (حرج), High (عالي), Medium (متوسط), Low (منخفض)
- [x] Update IdpView component to use translated criticality badges in objectives section
- [x] Update ObjectivesNav component to use translated criticality badges
- [x] Test criticality level display in both English and Arabic modes

## Progress Tracking Section Translation (v34)
- [x] Add Arabic translations for status dropdown options (Not Started, In Progress, Completed)
- [x] Add Arabic translations for progress tracking labels (Status, Progress, Deadline)
- [x] Add Arabic translations for buttons (Cancel, Update, Set deadline)
- [x] Add Arabic translation for progress slider instruction text
- [x] Update IdpView component to use translated progress tracking UI elements
- [x] Test progress tracking section in both English and Arabic modes

## GROW Model Title Fix (v35)
- [x] Remove duplicate "GROW" text in Arabic GROW Model title
- [x] Change from "نموذج GROW (GROW)" to "نموذج (GROW)"
- [x] Test GROW Model section display in Arabic mode

## Landing Page Flag Layout Fix (v36)
- [x] Remove border/outline from Saudi Arabia flag image
- [x] Remove border/outline from Oman flag image
- [x] Reorganize GCC flags to display 3 flags per row (2 rows total)
- [x] Test flag display on landing page

## Learning Resource Tabs Translation (v37)
- [x] Add Arabic translations for resource type tabs (Courses, Books, Certifications, Workshops)
- [x] Update LearningResources component to use translated tab labels
- [x] Test resource tabs display in Arabic mode

## Saudi Arabia Flag Replacement (v38)
- [x] Copy user-provided Saudi Arabia flag image to public folder
- [x] Update LanguageSelection component to use new Saudi flag image
- [x] Test flag display on landing page

## Landing Page LTR Fix and Admin Dashboard Access (v39)
- [x] Fix landing page to display left-to-right (currently showing RTL)
- [x] Update App.tsx to force LTR on landing page route
- [x] Add admin-only access control to Dashboard page
- [x] Redirect non-admin users away from dashboard
- [x] Test landing page displays LTR correctly
- [x] Implement dashboard access restriction for non-admin users

## Home Page Arabic Text Punctuation Fix (v40)
- [x] Remove period from whatIsIdpDesc1 Arabic translation
- [x] Remove period from whatIsIdpDesc2 Arabic translation
- [x] Verify changes display correctly on Home page

## Three UX Improvements (v41)
- [x] Add smooth scroll animations to Home page sections using Intersection Observer
- [x] Add language toggle button to navigation header in Home and IdpView pages
- [x] Add print-friendly CSS styles for IDP reports

## Admin User Management Panel (v42)
- [x] Add tRPC procedures: listUsers, updateUserRole, getUserIdpStats
- [x] Build AdminUsers page with user table showing name, email, role, IDP count, last active
- [x] Add role promote/demote controls (admin ↔ user) with confirmation dialog
- [x] Add IDP activity stats per user (total IDPs, last generated)
- [x] Wire AdminUsers page into App.tsx routing (admin-only guard)
- [x] Add "User Management" button to Dashboard header navigation
- [x] Write and pass vitest tests for admin procedures (11 tests passing)

## Activity Log for Role Changes (v43)
- [x] Add roleAuditLog table to drizzle schema (actorId, targetUserId, oldRole, newRole, timestamp)
- [x] Push schema migration
- [x] Log role changes in updateUserRole tRPC procedure
- [x] Add getAuditLog tRPC procedure (admin only)
- [x] Add Activity Log tab to AdminUsers page showing timestamped history table

## IDP Delete/Edit from Admin Dashboard (v43)
- [x] Add deleteIdp and deleteMultipleIdps tRPC procedures (admin only)
- [x] Add checkbox column to IDP list in Dashboard
- [x] Add bulk delete button when checkboxes selected (shows count)
- [x] Add individual delete button per IDP row
- [x] Add confirmation dialog before deletion

## AI Chatbot Toggle Button (v43)
- [x] Add show/hide toggle button in IdpView header (Bot/BotOff icon)
- [x] Conditionally render CoachingAssistant based on showChatbot state
- [x] Support Arabic label for toggle button
- [x] 30 vitest tests passing (14 new + 11 existing + 5 others)

## Dashboard v44 Features
- [x] IDP edit from dashboard: admin can update employee details (name, position, manager) without regenerating
- [x] CSV export: download full IDP list as spreadsheet (name, objectives count, completion %, last updated)
- [x] IDP status filter: filter IDPs by overall completion status (Not Started / In Progress / Completed)
- [x] Status filter cards are clickable (click stat card to filter by that status)
- [x] 43 vitest tests passing (13 new + 30 existing)

## Dashboard Search Bar (v45)
- [x] Add search input to Dashboard IDP list header
- [x] Filter IDPs by employee name, department, manager, position, company in real-time
- [x] Combine search with existing status filter
- [x] Show result count badge and clear (X) button when search is active
- [x] 50 vitest tests passing (7 new search filter tests + 43 existing)
