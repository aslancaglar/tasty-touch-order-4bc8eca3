// Import DEFAULT_LANGUAGE from the updated language-utils file
import { useTranslation, SupportedLanguage, DEFAULT_LANGUAGE } from "@/utils/language-utils";
import { useEffect, useState } from "react";

const OwnerDashboard = () => {
    const [language, setLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
    const { t } = useTranslation(language);

    useEffect(() => {
        // You can add any initialization logic here
    }, []);

    return (
        <div>
            <h1>{t('welcome.tagline')} Owner Dashboard</h1>
            {/* Add more content here */}
        </div>
    );
};

export default OwnerDashboard;
