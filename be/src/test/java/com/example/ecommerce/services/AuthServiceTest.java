package com.example.ecommerce.services;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.TroppeRichiesteException;
import com.example.ecommerce.exceptions.UnauthorizedException;
import com.example.ecommerce.payloads.LoginDTO;
import com.example.ecommerce.repositories.UtenteRepository;
import com.example.ecommerce.security.JWTTools;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UtenteRepository utenteRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JWTTools jwtTools;
    @Mock
    private TokenRevocatoService tokenRevocatoService;
    // limitatore vero: al massimo 2 tentativi falliti per utenza, l'IP non conta in questi test
    @Spy
    private LimitatoreLogin limitatoreLogin = new LimitatoreLogin(100, 2, Clock.systemUTC());

    @InjectMocks
    private AuthService service;

    private static final String IP = "1.1.1.1";

    // come per l'email: "MARIO" e "mario" al login sono lo stesso username
    @Test
    void loginPerUsernameIgnoraLeMaiuscole() {
        Utente mario = new Utente("Mario", "mario@esempio.it", "hash");
        when(utenteRepository.findByUsernameIgnoreCase("MARIO")).thenReturn(List.of(mario));
        when(passwordEncoder.matches("password123", "hash")).thenReturn(true);
        when(jwtTools.generaToken(same(mario))).thenReturn("token-di-mario");

        assertThat(service.login(new LoginDTO("MARIO", "password123"), IP).token()).isEqualTo("token-di-mario");
    }

    // account vecchi registrati prima della regola: due username uguali a meno delle maiuscole.
    // Vale quello scritto esattamente
    @Test
    void conDueUsernameVecchiValeQuelloScrittoEsattamente() {
        Utente maiuscolo = new Utente("Mario", "a@esempio.it", "hash-a");
        Utente minuscolo = new Utente("mario", "b@esempio.it", "hash-b");
        when(utenteRepository.findByUsernameIgnoreCase("mario")).thenReturn(List.of(maiuscolo, minuscolo));
        when(passwordEncoder.matches(anyString(), eq("hash-b"))).thenReturn(true);
        when(jwtTools.generaToken(same(minuscolo))).thenReturn("token-b");

        assertThat(service.login(new LoginDTO("mario", "password123"), IP).token()).isEqualTo("token-b");
    }

    // dopo troppi tentativi falliti il login risponde 429 senza nemmeno controllare la password
    @Test
    void troppiLoginFallitiRispondono429() {
        Utente mario = new Utente("mario", "mario@esempio.it", "hash");
        when(utenteRepository.findByUsernameIgnoreCase("mario")).thenReturn(List.of(mario));
        when(passwordEncoder.matches("sbagliata", "hash")).thenReturn(false);

        for (int i = 0; i < 2; i++) {
            assertThatThrownBy(() -> service.login(new LoginDTO("mario", "sbagliata"), IP))
                    .isInstanceOf(UnauthorizedException.class);
        }
        assertThatThrownBy(() -> service.login(new LoginDTO("mario", "sbagliata"), IP))
                .isInstanceOf(TroppeRichiesteException.class);
        verify(passwordEncoder, times(2)).matches("sbagliata", "hash");
    }

    // un'utenza che non esiste conta come le altre: il 429 non rivela quali account sono registrati
    @Test
    void ancheUnUtenzaInesistenteArrivaAl429() {
        when(utenteRepository.findByUsernameIgnoreCase("nessuno")).thenReturn(List.of());

        for (int i = 0; i < 2; i++) {
            assertThatThrownBy(() -> service.login(new LoginDTO("nessuno", "password123"), IP))
                    .isInstanceOf(UnauthorizedException.class);
        }
        assertThatThrownBy(() -> service.login(new LoginDTO("nessuno", "password123"), IP))
                .isInstanceOf(TroppeRichiesteException.class);
    }

    // chi entra ricomincia da zero: gli errori di prima non si sommano a quelli dopo
    @Test
    void unLoginRiuscitoAzzeraITentativi() {
        Utente mario = new Utente("mario", "mario@esempio.it", "hash");
        when(utenteRepository.findByUsernameIgnoreCase("mario")).thenReturn(List.of(mario));
        when(passwordEncoder.matches("sbagliata", "hash")).thenReturn(false);
        when(passwordEncoder.matches("giusta123", "hash")).thenReturn(true);
        when(jwtTools.generaToken(same(mario))).thenReturn("token");

        assertThatThrownBy(() -> service.login(new LoginDTO("mario", "sbagliata"), IP)).isInstanceOf(UnauthorizedException.class);
        service.login(new LoginDTO("mario", "giusta123"), IP);
        assertThatThrownBy(() -> service.login(new LoginDTO("mario", "sbagliata"), IP)).isInstanceOf(UnauthorizedException.class);

        assertThat(service.login(new LoginDTO("mario", "giusta123"), IP).token()).isEqualTo("token");
    }

    // utenza inesistente: BCrypt gira lo stesso, su un hash finto, così il tempo di risposta
    // non rivela se l'account esiste (senza, la risposta arriverebbe in pochi millisecondi)
    @Test
    void conUnUtenzaInesistenteLaPasswordSiControllaComunque() {
        when(utenteRepository.findByUsernameIgnoreCase("nessuno")).thenReturn(List.of());

        assertThatThrownBy(() -> service.login(new LoginDTO("nessuno", "password123"), IP))
                .isInstanceOf(UnauthorizedException.class);
        // un hash BCrypt vero, con lo stesso costo di quelli salvati: un hash non valido si scarterebbe subito
        verify(passwordEncoder).matches(eq("password123"), argThat(hash -> hash != null && hash.matches("\\$2a\\$10\\$.{53}")));
    }
}
