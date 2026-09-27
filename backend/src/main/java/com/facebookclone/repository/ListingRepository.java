package com.facebookclone.repository;

import com.facebookclone.entity.Listing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ListingRepository extends JpaRepository<Listing, Long> {

    @Query("""
           SELECT l FROM Listing l JOIN FETCH l.seller
           WHERE (:category IS NULL OR l.category = :category)
             AND l.status <> com.facebookclone.entity.Listing.Status.SOLD
           ORDER BY l.createdAt DESC
           """)
    List<Listing> findAvailable(@Param("category") String category);

    @Query("SELECT l FROM Listing l JOIN FETCH l.seller WHERE l.seller.id = :sellerId ORDER BY l.createdAt DESC")
    List<Listing> findBySeller(@Param("sellerId") Long sellerId);

    @Query("""
           SELECT l FROM Listing l JOIN FETCH l.seller
           WHERE LOWER(l.title) LIKE LOWER(CONCAT(:wild, :q, :wild))
              OR LOWER(l.description) LIKE LOWER(CONCAT(:wild, :q, :wild))
           ORDER BY l.createdAt DESC
           """)
    List<Listing> searchWild(@Param("q") String q, @Param("wild") String wild);

    default List<Listing> search(String q) {
        return searchWild(q, "%");
    }
}
