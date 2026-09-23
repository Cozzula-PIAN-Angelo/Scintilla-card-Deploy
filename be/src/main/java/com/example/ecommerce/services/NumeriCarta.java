package com.example.ecommerce.services;

import java.util.Comparator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// ordine "da album" dei numeri di carta: prima i numeri semplici (1, 2, ..., 102), poi quelli con
// prefisso (GG01, TG01), infine quelli senza cifre; null in fondo
final class NumeriCarta {

    // es. "4" -> ("", 4, ""), "TG01" -> ("TG", 1, ""), "123a" -> ("", 123, "a")
    private static final Pattern NUMERO_CARTA = Pattern.compile("^(\\D*)(\\d+)(.*)$");

    private NumeriCarta() {
    }

    static int confronta(String a, String b) {
        if (a == null || b == null) {
            return a == null ? (b == null ? 0 : 1) : -1;
        }
        Matcher ma = NUMERO_CARTA.matcher(a);
        Matcher mb = NUMERO_CARTA.matcher(b);
        boolean aNumerico = ma.matches();
        boolean bNumerico = mb.matches();
        if (!aNumerico || !bNumerico) {
            return aNumerico == bNumerico ? a.compareTo(b) : (aNumerico ? -1 : 1);
        }
        return Comparator.comparing((Matcher m) -> m.group(1))
                .thenComparingLong(m -> Long.parseLong(m.group(2)))
                .thenComparing(m -> m.group(3))
                .compare(ma, mb);
    }
}
