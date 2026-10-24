package com.lighthousefellowship.backend.service.support;

// Full emails never go into logs (AGENTS.md, data-privacy-and-audit).
// "joe@example.com" -> "j***@example.com".
public final class EmailMasker {

    private EmailMasker() {
    }

    public static String mask(String email) {
        if (email == null || email.isBlank()) {
            return "<none>";
        }
        String trimmed = email.strip();
        int at = trimmed.indexOf('@');
        if (at <= 0) {
            return "***";
        }
        return trimmed.charAt(0) + "***" + trimmed.substring(at);
    }
}
