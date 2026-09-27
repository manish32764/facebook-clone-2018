package com.facebookclone.controller;

import com.facebookclone.dto.SearchDtos.SearchResultsDto;
import com.facebookclone.security.AppUserPrincipal;
import com.facebookclone.security.CurrentUser;
import com.facebookclone.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    /** Everything matching one query, split into the tabs the results page shows. */
    @GetMapping
    public SearchResultsDto search(@RequestParam("q") String query, @CurrentUser AppUserPrincipal me) {
        return searchService.searchAll(query, me.getId());
    }
}
