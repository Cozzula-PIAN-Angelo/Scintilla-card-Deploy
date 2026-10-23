package com.example.ecommerce.services;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

// quanto è ambita una rarità di TCGdex (testo libero, in inglese): 6 illustrazione speciale, iper, segrete, RGB;
// 5 illustrate; 4 ultra rare e simili; 3 doppie rare; 2 rare e holo; 1 non comuni; 0 il resto
public final class GradoRarita {

    // dalla più ambita: vince la prima regola che corrisponde ("special illustration" prima di "illustration")
    private static final Map<Pattern, Integer> REGOLE = new LinkedHashMap<>();

    static {
        REGOLE.put(Pattern.compile("special illustration|hyper|secret|rgb|gold|rainbow"), 6);
        REGOLE.put(Pattern.compile("illustration"), 5);
        REGOLE.put(Pattern.compile("ultra|full art|ace|shiny|radiant"), 4);
        REGOLE.put(Pattern.compile("double|vmax|vstar"), 3);
        REGOLE.put(Pattern.compile("holo|rare"), 2);
        REGOLE.put(Pattern.compile("uncommon"), 1);
    }

    private GradoRarita() {
    }

    public static int di(String rarita) {
        if (rarita == null) {
            return 0;
        }
        String testo = rarita.toLowerCase(Locale.ROOT);
        return REGOLE.entrySet().stream()
                .filter(regola -> regola.getKey().matcher(testo).find())
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(0);
    }
}
