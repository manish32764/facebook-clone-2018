package com.facebookclone.service;

import com.facebookclone.dto.ExtrasDtos.*;
import com.facebookclone.dto.UserDto;
import com.facebookclone.entity.GameScore;
import com.facebookclone.entity.User;
import com.facebookclone.exception.ApiException;
import com.facebookclone.repository.FriendshipRepository;
import com.facebookclone.repository.GameScoreRepository;
import com.facebookclone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Instant games. The games themselves run in the browser; the server keeps
 * scores and ranks you against your friends.
 */
@Service
@RequiredArgsConstructor
public class GameService {

    private record Game(String key, String name, String description, String color) {}

    private static final List<Game> CATALOG = List.of(
            new Game("SNAKE", "Snake", "Eat, grow, and don't bite your own tail.", "#42b72a"),
            new Game("G2048", "2048", "Slide the tiles and merge your way to 2048.", "#f7b125"),
            new Game("MEMORY", "Memory Match", "Flip the cards and find every pair in as few moves as you can.", "#4267b2"));

    /** Scores above this are rejected as implausible for these games. */
    private static final long MAX_SCORE = 10_000_000L;

    private final GameScoreRepository scoreRepository;
    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final UserService userService;

    @Transactional(readOnly = true)
    public List<GameDto> catalog(Long viewerId) {
        Map<String, long[]> stats = new HashMap<>();
        for (Object[] row : scoreRepository.myStats(viewerId)) {
            stats.put((String) row[0], new long[]{((Number) row[1]).longValue(), (Long) row[2]});
        }
        return CATALOG.stream().map(g -> {
            long[] mine = stats.getOrDefault(g.key(), new long[]{0, 0});
            return new GameDto(g.key(), g.name(), g.description(), g.color(), mine[0], mine[1],
                    leaders(g.key(), viewerId, 5));
        }).toList();
    }

    @Transactional
    public ScoreResultDto submit(String gameKey, Long userId, long score) {
        Game game = require(gameKey);
        if (score < 0 || score > MAX_SCORE) throw ApiException.badRequest("That score is not possible");

        long previousBest = scoreRepository.bestByUser(game.key(), List.of(userId)).stream()
                .findFirst().map(row -> ((Number) row[1]).longValue()).orElse(0L);
        User user = userService.require(userId);
        scoreRepository.save(GameScore.builder().user(user).game(game.key()).score(score).build());

        return new ScoreResultDto(score, Math.max(previousBest, score), score > previousBest,
                leaders(game.key(), userId, 10));
    }

    @Transactional(readOnly = true)
    public List<LeaderDto> leaderboard(String gameKey, Long viewerId) {
        return leaders(require(gameKey).key(), viewerId, 20);
    }

    /** You and your friends, best score each, highest first. */
    private List<LeaderDto> leaders(String game, Long viewerId, int limit) {
        List<Long> ids = new ArrayList<>(friendshipRepository.findFriendIds(viewerId));
        ids.add(viewerId);

        List<Object[]> rows = new ArrayList<>(scoreRepository.bestByUser(game, ids));
        rows.sort((a, b) -> Long.compare(((Number) b[1]).longValue(), ((Number) a[1]).longValue()));
        List<Object[]> top = rows.stream().limit(limit).toList();

        Map<Long, User> users = new HashMap<>();
        userRepository.findAllById(top.stream().map(r -> (Long) r[0]).toList()).forEach(u -> users.put(u.getId(), u));

        List<LeaderDto> out = new ArrayList<>();
        int rank = 1;
        for (Object[] row : top) {
            User u = users.get((Long) row[0]);
            if (u != null) out.add(new LeaderDto(UserDto.summary(u), ((Number) row[1]).longValue(), rank++));
        }
        return out;
    }

    private static Game require(String key) {
        return CATALOG.stream().filter(g -> g.key().equalsIgnoreCase(key)).findFirst()
                .orElseThrow(() -> ApiException.notFound("Game"));
    }
}
