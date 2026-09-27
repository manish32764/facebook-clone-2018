package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SavedListingRepository extends JpaRepository<SavedListing, Long> {

    Optional<SavedListing> findByUserIdAndListingId(Long userId, Long listingId);

    @Query("SELECT s.listing.id FROM SavedListing s WHERE s.user.id = :userId ORDER BY s.createdAt DESC")
    List<Long> findListingIds(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM SavedListing s WHERE s.listing.id = :listingId")
    void deleteByListingId(@Param("listingId") Long listingId);
}
