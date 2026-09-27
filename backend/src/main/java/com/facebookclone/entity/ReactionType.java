package com.facebookclone.entity;

/**
 * The six reactions Facebook shipped in 2016 and still uses. LIKE is the default
 * so a plain click on the Like button keeps behaving the way it always did.
 */
public enum ReactionType {
    LIKE("Like", "\uD83D\uDC4D"),
    LOVE("Love", "\u2764\uFE0F"),
    HAHA("Haha", "\uD83D\uDE06"),
    WOW("Wow", "\uD83D\uDE2E"),
    SAD("Sad", "\uD83D\uDE22"),
    ANGRY("Angry", "\uD83D\uDE21");

    private final String label;
    private final String emoji;

    ReactionType(String label, String emoji) {
        this.label = label;
        this.emoji = emoji;
    }

    public String getLabel() { return label; }

    public String getEmoji() { return emoji; }

    /** Unknown or missing values fall back to LIKE rather than throwing. */
    public static ReactionType parse(String raw) {
        if (raw == null || raw.isBlank()) return LIKE;
        try {
            return valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return LIKE;
        }
    }
}
