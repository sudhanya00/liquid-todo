/**
 * AI Request Counter
 * 
 * Displays remaining AI requests for free users
 */

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { SparkleIcon } from "@/components/icons/CustomIcons";
import { useAuth } from "@/context/AuthContext";
import { getUserPlan, getQuotaDisplay } from "@/lib/entitlements";

export default function AIRequestCounter() {
    const { user } = useAuth();
    const [quotaDisplay, setQuotaDisplay] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadQuota = async (forceRefresh = false) => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        // Get fresh plan data
        const currentPlan = await getUserPlan(user.uid);

        // Only show for free users
        if (currentPlan?.tier === "pro") {
            setQuotaDisplay(null);
            setLoading(false);
            return;
        }

        try {
            const display = await getQuotaDisplay(user.uid, "create_ai_request");
            setQuotaDisplay(display);
        } catch (error) {
            console.error("Failed to load quota:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadQuota();
    }, [user]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadQuota(true);
    };

    if (loading || !quotaDisplay) {
        return null;
    }

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg text-sm">
            <SparkleIcon className="w-4 h-4" animate />
            <span className="text-gray-300">{quotaDisplay}</span>
            <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="ml-1 p-0.5 hover:bg-purple-500/20 rounded transition-colors disabled:opacity-50"
                title="Refresh quota"
            >
                <RefreshCw className={`w-3 h-3 text-purple-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
        </div>
    );
}
