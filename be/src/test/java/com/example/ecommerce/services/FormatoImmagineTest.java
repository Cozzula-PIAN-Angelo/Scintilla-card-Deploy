package com.example.ecommerce.services;

import com.example.ecommerce.exceptions.BadRequestException;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FormatoImmagineTest {

    @Test
    void riconosceJpegPngEWebp() {
        assertThat(FormatoImmagine.controlla(conIntestazione(0xFF, 0xD8, 0xFF, 0xE0))).isEqualTo("image/jpeg");
        assertThat(FormatoImmagine.controlla(conIntestazione(0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A))).isEqualTo("image/png");
        assertThat(FormatoImmagine.controlla(conIntestazione('R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'))).isEqualTo("image/webp");
    }

    @Test
    void immagineVuota() {
        assertThatThrownBy(() -> FormatoImmagine.controlla(new byte[0]))
                .isInstanceOf(BadRequestException.class).hasMessage("L'immagine è vuota");
    }

    @Test
    void oltreUnMega() {
        byte[] grande = new byte[FormatoImmagine.DIMENSIONE_MASSIMA + 1];
        grande[0] = (byte) 0xFF;
        grande[1] = (byte) 0xD8;
        grande[2] = (byte) 0xFF;

        assertThatThrownBy(() -> FormatoImmagine.controlla(grande))
                .isInstanceOf(BadRequestException.class).hasMessage("L'immagine supera 1 MB");
    }

    @Test
    void formatoNonSupportato() {
        byte[] gif = Arrays.copyOf("GIF89a".getBytes(StandardCharsets.US_ASCII), 32);

        assertThatThrownBy(() -> FormatoImmagine.controlla(gif))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("JPEG, PNG o WebP");
    }

    // intestazione seguita da qualche byte: le immagini vere sono più lunghe della firma
    private static byte[] conIntestazione(int... firma) {
        byte[] b = new byte[firma.length + 16];
        for (int i = 0; i < firma.length; i++) b[i] = (byte) firma[i];
        return b;
    }
}
