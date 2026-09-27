package com.facebookclone.dto;

import com.facebookclone.dto.EventDtos.EventDto;
import com.facebookclone.dto.FriendDtos.FriendDto;
import com.facebookclone.dto.GroupDtos.GroupDto;
import com.facebookclone.dto.ListingDtos.ListingDto;
import com.facebookclone.dto.PageDtos.PageDto;
import com.facebookclone.dto.PostDtos.PostDto;

import java.util.List;

public final class SearchDtos {

    private SearchDtos() {}

    /** One payload behind the search-results page and its tab counts. */
    public record SearchResultsDto(
            String query,
            List<FriendDto> people,
            List<PostDto> posts,
            List<GroupDto> groups,
            List<EventDto> events,
            List<ListingDto> listings,
            List<PageDto> pages
    ) {}
}
