"use client";

import { useUser } from '@/contexts/UserContext';
import { useState, useEffect, useMemo } from 'react';

interface LevelDefinition {
    level: number;
    name: string;
    minBits: number;
    visualConfig: any;
    unlockedFeatures: string[];
}

export function useLevelPermission() {
    const { user } = useUser();
    const [levels, setLevels] = useState<LevelDefinition[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLevels = async () => {
            try {
                const res = await fetch('/api/system/levels');
                if (res.ok) {
                    const json = await res.json();
                    if (json.success) {
                        setLevels(json.data);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch level definitions", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLevels();
    }, []);

    const currentUserLevelDef = useMemo(() => {
        if (!user || !levels.length) return null;
        return levels.find(l => l.level === user.level) || null;
    }, [user, levels]);

    const hasPermission = (featureKey: string): boolean => {
        if (!user) return false;

        // 管理员 (Pro用户) 拥有所有权限，不受等级限制
        if (user.isAdmin) return true;

        // If levels are still loading, we might want to return false or rely on user.level if we have a fallback mapping.
        // But the most accurate is to check unlockedFeatures of current level and all previous levels.

        if (!levels.length) return false;

        // Find all levels up to current user level
        const accessibleLevels = levels.filter(l => l.level <= (user.level || 0));

        // Check if any of these levels unlock the feature
        return accessibleLevels.some(l => l.unlockedFeatures.includes(featureKey));
    };

    const getRequiredLevel = (featureKey: string): number | null => {
        if (!levels.length) return null;

        // Find the first level that unlocks this feature
        const levelDef = levels.slice().sort((a, b) => a.level - b.level).find(l => l.unlockedFeatures.includes(featureKey));
        return levelDef ? levelDef.level : null;
    };

    return {
        hasPermission,
        getRequiredLevel,
        currentUserLevel: user?.level || 0,
        currentUserBits: user?.bits || 0,
        currentUserLevelDef,
        levels,
        loading
    };
}
