package com.facebookclone.service;

import com.facebookclone.dto.FriendDtos.FriendDto;
import com.facebookclone.dto.SearchDtos.SearchResultsDto;
import com.facebookclone.dto.UserDto;
import com.facebookclone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/** One call behind the search-results page, so every tab arrives together. */
@Service
@RequiredArgsConstructor
public class SearchService {

    private static final int PER_SECTION = 20;

    private final UserRepository userRepository;
    private final FriendService friendService;
    private final PostService postService;
    private final GroupService groupService;
    private final EventService eventService;
    private final MarketplaceService marketplaceService;
    private final PageService pageService;
    private final ViewerScopeService scopeService;

    @Transactional(readOnly = true)
    public SearchResultsDto searchAll(String query, Long viewerId) {
        String q = query == null ? "" : query.trim();
        if (q.length() < 2) {
            return new SearchResultsDto(q, List.of(), List.of(), List.of(), List.of(), List.of(), List.of());
        }

        Set<Long> hidden = scopeService.hiddenIds(viewerId);
        List<FriendDto> people = userRepository.search(q, viewerId).stream()
                .filter(u -> !hidden.contains(u.getId()))
                .limit(PER_SECTION)
                .map(u -> new FriendDto(UserDto.summary(u),
                        friendService.relationship(viewerId, u.getId()), 0))
                .toList();

        return new SearchResultsDto(
                q,
                people,
                postService.search(q, viewerId, PER_SECTION),
                groupService.search(q, viewerId),
                eventService.search(q, viewerId),
                marketplaceService.search(q, viewerId),
                pageService.search(q, viewerId));
    }
}
