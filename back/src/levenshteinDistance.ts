export function levenshteinDistance(str1: string, str2: string): number {
    if (str1 == null || str1.length === 0 || str2 == null || str2.length === 0) {
        return -1;
    }

    const dp = Array.from({ length: str1.length + 1 }, () => Array(str2.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) dp[i][0] = i;
    for (let j = 0; j <= str2.length; j++) dp[0][j] = j;

    for (let i = 1; i <= str1.length; i++) {
        for (let j = 1; j <= str2.length; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + 1
                );
            }
        }
    }

    return dp[str1.length][str2.length];
}