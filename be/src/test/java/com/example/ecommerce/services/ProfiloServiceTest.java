package com.example.ecommerce.services;

import com.example.ecommerce.entities.Binder;
import com.example.ecommerce.entities.MotivoBinder;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.entities.Profilo;
import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.payloads.BinderResponseDTO;
import com.example.ecommerce.payloads.ModificaProfiloDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.payloads.ProfiloDTO;
import com.example.ecommerce.repositories.BinderRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import com.example.ecommerce.repositories.ProfiloRepository;
import com.example.ecommerce.repositories.SlotBinderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
// riepilogo e conteggi delle tasche servono solo ai test che leggono il profilo
@MockitoSettings(strictness = Strictness.LENIENT)
class ProfiloServiceTest {

    @Mock
    private ProfiloRepository profiloRepository;
    @Mock
    private OggettoRepository oggettoRepository;
    @Mock
    private BinderRepository binderRepository;
    @Mock
    private SlotBinderRepository slotRepository;
    @Mock
    private StatisticheService statisticheService;

    private ProfiloService service;
    private Utente utente;
    private UUID id;
    private final ProfiloDTO.RiepilogoDTO riepilogo = new ProfiloDTO.RiepilogoDTO(0, 0, 0, 0);

    @BeforeEach
    void prepara() {
        service = new ProfiloService(profiloRepository, oggettoRepository, binderRepository, slotRepository, statisticheService);
        id = UUID.randomUUID();
        utente = new Utente("mario", "mario@esempio.it", "hash");
        ReflectionTestUtils.setField(utente, "id", id);
        ReflectionTestUtils.setField(utente, "createdAt", Instant.parse("2026-01-15T10:00:00Z"));
        when(statisticheService.riepilogo(id)).thenReturn(riepilogo);
        when(slotRepository.contaCartePerBinder(id)).thenReturn(List.of());
        when(profiloRepository.save(any(Profilo.class))).thenAnswer(invocazione -> invocazione.getArgument(0));
    }

    @Test
    void profiloMaiSalvatoHaValoriVuoti() {
        when(profiloRepository.findById(id)).thenReturn(Optional.empty());

        ProfiloDTO profilo = service.getProfilo(utente);

        assertThat(profilo.username()).isEqualTo("mario");
        assertThat(profilo.iscrittoIl()).isEqualTo(Instant.parse("2026-01-15T10:00:00Z"));
        assertThat(profilo.bio()).isNull();
        assertThat(profilo.colore()).isNull();
        assertThat(profilo.avatarAggiornatoIl()).isNull();
        assertThat(profilo.squadra()).isEmpty();
        assertThat(profilo.vetrina()).isEmpty();
        assertThat(profilo.binder()).isEmpty();
        assertThat(profilo.riepilogo()).isEqualTo(riepilogo);
        verify(profiloRepository, never()).save(any());
    }

    @Test
    void modificaCreaIlProfiloAlPrimoSalvataggio() {
        when(profiloRepository.findById(id)).thenReturn(Optional.empty());

        ProfiloDTO risposta = service.modifica(utente, new ModificaProfiloDTO("Ciao", "#2a75bb"));

        ArgumentCaptor<Profilo> salvato = ArgumentCaptor.forClass(Profilo.class);
        verify(profiloRepository).save(salvato.capture());
        assertThat(salvato.getValue().getBio()).isEqualTo("Ciao");
        assertThat(salvato.getValue().getColore()).isEqualTo("#2a75bb");
        assertThat(risposta.bio()).isEqualTo("Ciao");
    }

    @Test
    void bioSenzaSpaziAiBordiEVuotaDiventaNull() {
        Profilo profilo = profiloEsistente();

        service.modifica(utente, new ModificaProfiloDTO("  Ciao ", null));
        assertThat(profilo.getBio()).isEqualTo("Ciao");

        service.modifica(utente, new ModificaProfiloDTO("   ", null));
        assertThat(profilo.getBio()).isNull();
    }

    @Test
    void vetrinaOltreSeiCarte() {
        profiloEsistente();
        List<UUID> sette = IntStream.range(0, 7).mapToObj(i -> UUID.randomUUID()).toList();

        assertThatThrownBy(() -> service.salvaVetrina(utente, sette))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("6");
    }

    @Test
    void vetrinaConDoppioni() {
        profiloEsistente();
        UUID a = UUID.randomUUID();

        assertThatThrownBy(() -> service.salvaVetrina(utente, List.of(a, a))).isInstanceOf(BadRequestException.class);
    }

    @Test
    void vetrinaConCartaInesistente() {
        profiloEsistente();
        Oggetto a = carta("Abra");
        UUID b = UUID.randomUUID();
        when(oggettoRepository.findAllById(List.of(a.getId(), b))).thenReturn(List.of(a));

        assertThatThrownBy(() -> service.salvaVetrina(utente, List.of(a.getId(), b))).isInstanceOf(NotFoundException.class);
    }

    @Test
    void vetrinaSalvataNellOrdineRicevuto() {
        Profilo profilo = profiloEsistente();
        List<Oggetto> prima = profilo.getVetrina();
        Oggetto a = carta("Abra");
        Oggetto b = carta("Zubat");
        when(oggettoRepository.findAllById(List.of(b.getId(), a.getId()))).thenReturn(List.of(a, b));

        ProfiloDTO risposta = service.salvaVetrina(utente, List.of(b.getId(), a.getId()));

        assertThat(profilo.getVetrina()).containsExactly(b, a);
        assertThat(profilo.getVetrina()).isNotSameAs(prima);
        assertThat(risposta.vetrina()).extracting(OggettoResponseDTO::id).containsExactly(b.getId(), a.getId());
    }

    @Test
    void binderDiUnAltroUtente() {
        profiloEsistente();
        UUID altrui = UUID.randomUUID();
        when(binderRepository.findByIdAndUtenteId(altrui, id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.salvaBinder(utente, List.of(altrui))).isInstanceOf(NotFoundException.class);
    }

    @Test
    void binderOltreTre() {
        profiloEsistente();
        List<UUID> quattro = IntStream.range(0, 4).mapToObj(i -> UUID.randomUUID()).toList();

        assertThatThrownBy(() -> service.salvaBinder(utente, quattro))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("3");
    }

    @Test
    void binderSalvatiInOrdine() {
        Profilo profilo = profiloEsistente();
        Binder primo = binder("Primo");
        Binder secondo = binder("Secondo");
        when(binderRepository.findByIdAndUtenteId(secondo.getId(), id)).thenReturn(Optional.of(secondo));
        when(binderRepository.findByIdAndUtenteId(primo.getId(), id)).thenReturn(Optional.of(primo));

        ProfiloDTO risposta = service.salvaBinder(utente, List.of(secondo.getId(), primo.getId()));

        assertThat(profilo.getBinder()).containsExactly(secondo, primo);
        assertThat(risposta.binder()).extracting(BinderResponseDTO::nome).containsExactly("Secondo", "Primo");
    }

    @Test
    void squadraFuoriIntervalloODoppia() {
        profiloEsistente();

        assertThatThrownBy(() -> service.salvaSquadra(utente, List.of(0))).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.salvaSquadra(utente, List.of(1026))).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.salvaSquadra(utente, List.of(25, 25))).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.salvaSquadra(utente, List.of(1, 2, 3, 4, 5, 6, 7))).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.salvaSquadra(utente, Arrays.asList(25, null))).isInstanceOf(BadRequestException.class);
    }

    // il primo è il compagno
    @Test
    void squadraSalvataInOrdine() {
        Profilo profilo = profiloEsistente();

        ProfiloDTO risposta = service.salvaSquadra(utente, List.of(150, 25));

        assertThat(profilo.getSquadra()).containsExactly(150, 25);
        assertThat(risposta.squadra()).containsExactly(150, 25);
    }

    // una carta o un binder cancellati lasciano un null nella lista letta da Hibernate
    @Test
    void buchiNelleListeIgnorati() {
        Profilo profilo = profiloEsistente();
        Oggetto a = carta("Abra");
        Oggetto c = carta("Kadabra");
        profilo.setVetrina(new ArrayList<>(Arrays.asList(a, null, c)));
        profilo.setBinder(new ArrayList<>(Arrays.asList((Binder) null)));

        ProfiloDTO risposta = service.getProfilo(utente);

        assertThat(risposta.vetrina()).extracting(OggettoResponseDTO::id).containsExactly(a.getId(), c.getId());
        assertThat(risposta.binder()).isEmpty();
    }

    private Profilo profiloEsistente() {
        Profilo profilo = new Profilo(utente);
        when(profiloRepository.findById(id)).thenReturn(Optional.of(profilo));
        return profilo;
    }

    private static Oggetto carta(String nome) {
        Oggetto oggetto = new Oggetto(nome, BigDecimal.ONE);
        ReflectionTestUtils.setField(oggetto, "id", UUID.randomUUID());
        return oggetto;
    }

    private Binder binder(String nome) {
        Binder binder = new Binder(utente, nome, 9, 10, "#2a75bb", MotivoBinder.STELLE);
        ReflectionTestUtils.setField(binder, "id", UUID.randomUUID());
        return binder;
    }
}
